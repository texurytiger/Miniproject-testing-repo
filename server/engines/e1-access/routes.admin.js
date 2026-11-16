/**
 * E1 · /api/admin — users, roles, permissions, audit, permission report.
 * FR-06 deactivate · FR-07 roles & assignment · FR-11 audit log · FR-12 permission report
 */
const express = require('express');
const data = require('../e3-data');
const cache = require('./permissionCache');
const { guard } = require('./session');
const { HttpError, wrap, validator, NAME, toInt } = require('../../core/http');

const r = express.Router();

function rolesView() {
  return [...cache.state.roles.values()].map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    parentRoleId: role.parentRoleId,
    staffLogin: role.staffLogin,
    depth: cache.depthOf(role.id),
    directPermissions: [...(cache.state.direct.get(role.id) || [])].sort(),
    effectivePermissions: cache.permissionsOf(role.id).permissions,
  }));
}

const findRole = (id) => {
  const role = cache.state.roles.get(id);
  if (!role) throw new HttpError(404, 'NOT_FOUND', 'Role not found.');
  return role;
};

/* ---------- users ---------- */
r.get('/users', guard('user', 'assign_role'), wrap(async (_req, res) => {
  const users = await data.users.list();
  res.json({ users: users.map(({ tokenVersion, failedLogins, isLocked, ...u }) => ({ ...u, locked: isLocked })) });
}));

/** Takes effect on the user's next request: authenticate() re-reads the role every time. */
r.put('/users/:id/role', guard('user', 'assign_role'), wrap(async (req, res) => {
  const id = toInt(req.params.id); const roleId = toInt(req.body.roleId);
  if (id === req.user.id) throw new HttpError(403, 'SELF_CHANGE', 'You cannot change your own role. Ask another admin (lock-out guard).');
  findRole(roleId);
  const user = await data.users.byId(id);
  if (!user) throw new HttpError(404, 'NOT_FOUND', 'User not found.');
  await data.users.setRole(id, roleId);
  res.json({ user: await data.users.byId(id) });
}));

/** FR-06: deactivate / reactivate. Deactivating also ends every open session of that user. */
r.put('/users/:id/active', guard('user', 'deactivate'), wrap(async (req, res) => {
  const id = toInt(req.params.id);
  if (id === req.user.id) throw new HttpError(403, 'SELF_CHANGE', 'You cannot deactivate your own account.');
  if (!(await data.users.byId(id))) throw new HttpError(404, 'NOT_FOUND', 'User not found.');
  await data.users.setActive(id, !!req.body.isActive);
  if (req.body.isActive) await data.users.clearFailures(id);
  res.json({ user: await data.users.byId(id) });
}));

/* ---------- roles & permissions ---------- */
r.get('/roles', guard('role', 'manage'), (_req, res) => res.json({ roles: rolesView() }));
r.get('/permissions', guard('role', 'manage'), wrap(async (_req, res) => res.json({ permissions: await data.permissions.all() })));

r.post('/roles', guard('role', 'manage'), wrap(async (req, res) => {
  const name = String(req.body.name || '').trim().toUpperCase();
  const parentRoleId = toInt(req.body.parentRoleId);
  validator()
    .check(NAME.test(name), 'name', 'Role name: 2–39 capital letters, digits or _ (e.g. SUPPORT_AGENT)')
    .check(!cache.state.byName.has(name), 'name', 'A role with this name already exists')
    .check(parentRoleId === null || cache.state.roles.has(parentRoleId), 'parentRoleId', 'Parent role does not exist')
    .throwIfAny();
  const id = await data.roles.create({ name, description: String(req.body.description || ''), parentRoleId });
  await cache.rebuild();
  res.status(201).json({ id });
}));

/** Cycle check (DFS over the role's subtree) BEFORE saving: a cycle can never reach the database. */
r.put('/roles/:id/parent', guard('role', 'manage'), wrap(async (req, res) => {
  const role = findRole(toInt(req.params.id));
  const parentRoleId = toInt(req.body.parentRoleId);
  if (parentRoleId !== null) findRole(parentRoleId);
  if (cache.wouldCreateCycle(role.id, parentRoleId)) {
    const parent = cache.state.roles.get(parentRoleId);
    throw new HttpError(409, 'CYCLE', `Rejected: ${parent.name} already inherits from ${role.name}, so this would create a loop.`);
  }
  await data.roles.setParent(role.id, parentRoleId);
  await cache.rebuild();
  res.json({ roles: rolesView() });
}));

r.put('/roles/:id/permissions', guard('role', 'manage'), wrap(async (req, res) => {
  const role = findRole(toInt(req.params.id));
  const ids = new Set((await data.permissions.all()).map((p) => p.id));
  const grant = (req.body.grant || []).map(Number).filter((x) => ids.has(x));
  const revoke = (req.body.revoke || []).map(Number).filter((x) => ids.has(x));
  if (role.name === 'ADMIN' && revoke.length) {
    const all = await data.permissions.all();
    const critical = all.filter((p) => ['role:manage', 'user:assign_role'].includes(`${p.resource}:${p.action}`)).map((p) => p.id);
    if (revoke.some((x) => critical.includes(x))) throw new HttpError(403, 'LOCKOUT', 'ADMIN must keep role:manage and user:assign_role, or nobody could fix roles again.');
  }
  await data.roles.changePermissions(role.id, grant, revoke);
  await cache.rebuild();
  res.json({ roles: rolesView() });
}));

/* ---------- audit (FR-11) ---------- */
r.get('/audit', guard('audit', 'read'), wrap(async (req, res) => {
  const page = Math.max(1, toInt(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, toInt(req.query.pageSize) || 15));
  const decision = ['ALLOW', 'DENY'].includes(req.query.decision) ? req.query.decision : null;
  const resource = /^[a-z_]{1,40}$/.test(req.query.resource || '') ? req.query.resource : null;
  const { entries, total } = await data.audit.page({ page, pageSize, decision, resource });
  res.json({ entries, total, page, pageSize });
}));

/* ---------- permission report (FR-12) ---------- */
r.get('/report', guard('role', 'manage'), wrap(async (_req, res) => {
  const [counts, perms] = await Promise.all([data.users.countByRole(), data.permissions.all()]);
  const roles = rolesView().map((x) => ({ ...x, users: counts.get(x.id) || 0, inherited: x.effectivePermissions.length - x.directPermissions.length }));
  const held = new Set(roles.flatMap((x) => x.effectivePermissions));
  const warnings = [];
  roles.filter((x) => x.users > 0 && x.effectivePermissions.length === 0).forEach((x) => warnings.push(`${x.name} has ${x.users} user(s) but no permissions: every protected request is denied.`));
  roles.filter((x) => x.name !== 'ADMIN' && x.effectivePermissions.includes('role:manage')).forEach((x) => warnings.push(`${x.name} can manage roles: only ADMIN should.`));
  perms.filter((p) => !held.has(`${p.resource}:${p.action}`)).forEach((p) => warnings.push(`${p.resource}:${p.action} is not held by any role.`));
  cache.state.cycles.forEach((n) => warnings.push(`${n} is caught in a role cycle and has been given no permissions (fail closed).`));
  res.json({ roles, warnings, cacheBuiltAt: cache.state.builtAt, cacheBuildMs: cache.state.buildMs });
}));

module.exports = r;
