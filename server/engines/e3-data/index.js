/**
 * E3 · DBMS — the only module that runs SQL.
 * Other engines call these functions; they never import the pool or write queries themselves.
 */
const pool = require('../../core/db');

const userCols = `u.id, u.name, u.email, u.role_id AS roleId, r.name AS role, u.is_active AS isActive,
  u.token_version AS tokenVersion, u.failed_logins AS failedLogins, u.locked_until AS lockedUntil,
  (u.locked_until IS NOT NULL AND u.locked_until > NOW()) AS isLocked, u.created_at AS createdAt`;
const shapeUser = (u) => u && { ...u, isActive: !!u.isActive, isLocked: !!u.isLocked };

const users = {
  async byId(id) {
    const [rows] = await pool.query(`SELECT ${userCols} FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?`, [id]);
    return shapeUser(rows[0]);
  },
  async byEmailWithHash(email) {
    const [rows] = await pool.query(`SELECT ${userCols}, u.password_hash AS passwordHash FROM users u JOIN roles r ON r.id = u.role_id WHERE u.email = ?`, [email]);
    return shapeUser(rows[0]);
  },
  async hashById(id) {
    const [rows] = await pool.query('SELECT password_hash AS h FROM users WHERE id = ?', [id]);
    return rows[0] && rows[0].h;
  },
  async list() {
    const [rows] = await pool.query(`SELECT ${userCols} FROM users u JOIN roles r ON r.id = u.role_id ORDER BY u.id`);
    return rows.map(shapeUser);
  },
  async create({ name, email, passwordHash, roleId }) {
    const [r] = await pool.query('INSERT INTO users (name, email, password_hash, role_id) VALUES (?, ?, ?, ?)', [name, email, passwordHash, roleId]);
    return r.insertId;
  },
  setRole: (id, roleId) => pool.query('UPDATE users SET role_id = ? WHERE id = ?', [roleId, id]),
  setActive: (id, active) => pool.query('UPDATE users SET is_active = ?, token_version = token_version + 1 WHERE id = ?', [active ? 1 : 0, id]),
  bumpTokenVersion: (id) => pool.query('UPDATE users SET token_version = token_version + 1 WHERE id = ?', [id]),
  setPassword: (id, hash) => pool.query('UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?', [hash, id]),
  updateName: (id, name) => pool.query('UPDATE users SET name = ? WHERE id = ?', [name, id]),
  /** Wrong password from an unknown device: count it, and lock for new devices on the Nth one. */
  recordFailure: (id, lockAfter, lockMinutes) => pool.query(
    `UPDATE users SET failed_logins = failed_logins + 1,
       locked_until = IF(failed_logins >= ?, NOW() + INTERVAL ? MINUTE, locked_until)  -- MySQL applies SET left to right: failed_logins is already +1 here
     WHERE id = ?`, [lockAfter, lockMinutes, id]),
  clearFailures: (id) => pool.query('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?', [id]),
  countByRole: async () => {
    const [rows] = await pool.query('SELECT role_id AS roleId, COUNT(*) AS n FROM users GROUP BY role_id');
    return new Map(rows.map((r) => [r.roleId, r.n]));
  },
};

const roles = {
  async all() {
    const [rows] = await pool.query('SELECT id, name, description, parent_role_id AS parentRoleId, staff_login AS staffLogin FROM roles ORDER BY id');
    return rows.map((r) => ({ ...r, staffLogin: !!r.staffLogin }));
  },
  async grants() {
    const [rows] = await pool.query(
      `SELECT rp.role_id AS roleId, CONCAT(p.resource, ':', p.action) AS perm
         FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id`);
    return rows;
  },
  async create({ name, description, parentRoleId }) {
    const [r] = await pool.query('INSERT INTO roles (name, description, parent_role_id) VALUES (?, ?, ?)', [name, description || '', parentRoleId]);
    return r.insertId;
  },
  setParent: (id, parentRoleId) => pool.query('UPDATE roles SET parent_role_id = ? WHERE id = ?', [parentRoleId, id]),
  /** Grant and revoke in one transaction: all or nothing. */
  async changePermissions(roleId, grant, revoke) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      if (grant.length) await conn.query('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES ?', [grant.map((p) => [roleId, p])]);
      if (revoke.length) await conn.query('DELETE FROM role_permissions WHERE role_id = ? AND permission_id IN (?)', [roleId, revoke]);
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },
};

const permissions = {
  async all() {
    const [rows] = await pool.query('SELECT id, resource, action, description FROM permissions ORDER BY resource, action');
    return rows;
  },
};

const audit = {
  /** Insert-only: there is no update or delete function on purpose. */
  insert: (e) => pool.query(
    'INSERT INTO audit_log (user_id, email, resource, action, owner_id, decision, reason, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [e.userId ?? null, e.email ?? null, e.resource, e.action, e.ownerId ?? null, e.decision, e.reason, e.ip ?? null]),
  async page({ page, pageSize, decision, resource, userId }) {
    const where = []; const args = [];
    if (decision) { where.push('decision = ?'); args.push(decision); }
    if (resource) { where.push('resource = ?'); args.push(resource); }
    if (userId) { where.push('user_id = ?'); args.push(userId); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM audit_log ${w}`, args);
    const [rows] = await pool.query(
      `SELECT id, user_id AS userId, email, resource, action, owner_id AS ownerId, decision, reason, ip, created_at AS createdAt
         FROM audit_log ${w} ORDER BY id DESC LIMIT ? OFFSET ?`, [...args, pageSize, (page - 1) * pageSize]);
    return { entries: rows, total };
  },
};

const productCols = `p.id, p.seller_id AS sellerId, s.name AS sellerName, p.category_id AS categoryId, c.slug AS category, c.name AS categoryName,
  p.name, p.description, p.price, p.mrp, p.rating, p.reviews, p.stock, p.image, p.status, p.created_at AS createdAt`;
const productFrom = 'FROM products p JOIN users s ON s.id = p.seller_id JOIN categories c ON c.id = p.category_id';

const catalog = {
  async categories() {
    const [rows] = await pool.query(
      `SELECT c.id, c.slug, c.name, COUNT(p.id) AS products FROM categories c
         LEFT JOIN products p ON p.category_id = c.id AND p.status = 'APPROVED' GROUP BY c.id ORDER BY c.id`);
    return rows;
  },
  /** Storefront: APPROVED only. q uses the FULLTEXT index, with a LIKE fallback for short words. */
  async storefront({ category, q, limit }) {
    const where = ["p.status = 'APPROVED'"]; const args = [];
    if (category) { where.push('c.slug = ?'); args.push(category); }
    if (q) { where.push('(MATCH(p.name, p.description) AGAINST (? IN BOOLEAN MODE) OR p.name LIKE ?)'); args.push(`${q}*`, `%${q}%`); }
    const [rows] = await pool.query(`SELECT ${productCols} ${productFrom} WHERE ${where.join(' AND ')} ORDER BY p.reviews DESC LIMIT ?`, [...args, limit]);
    return rows;
  },
  async byId(id) {
    const [rows] = await pool.query(`SELECT ${productCols} ${productFrom} WHERE p.id = ?`, [id]);
    return rows[0];
  },
  async bySeller(sellerId) {
    const [rows] = await pool.query(`SELECT ${productCols} ${productFrom} WHERE p.seller_id = ? ORDER BY p.id`, [sellerId]);
    return rows;
  },
  async all() {
    const [rows] = await pool.query(`SELECT ${productCols} ${productFrom} ORDER BY p.id`);
    return rows;
  },
  /** Price/stock edit. Stock 0 flips an APPROVED product to SOLD_OUT and back on restock. */
  async updatePriceStock(id, { price, stock }) {
    await pool.query(
      `UPDATE products SET price = COALESCE(?, price), stock = COALESCE(?, stock),
         status = CASE WHEN status = 'PENDING' THEN 'PENDING' WHEN COALESCE(?, stock) = 0 THEN 'SOLD_OUT' ELSE 'APPROVED' END
       WHERE id = ?`, [price, stock, stock, id]);
  },
  approve: (id) => pool.query("UPDATE products SET status = IF(stock = 0, 'SOLD_OUT', 'APPROVED') WHERE id = ? AND status = 'PENDING'", [id]),
};

module.exports = { users, roles, permissions, audit, catalog, ping: () => pool.query('SELECT 1') };
