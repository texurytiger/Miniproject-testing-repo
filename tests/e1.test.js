/**
 * E1 authorization engine · end-to-end tests against the running API.
 *   npm run db:reset && npm start      (in one terminal)
 *   npm test                            (in another)
 */
const test = require('node:test');
const assert = require('node:assert');

const BASE = process.env.API || 'http://localhost:4000/api';
const PW = 'Password@123';

async function call(method, path, { body, token, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = {};
  try { data = await res.json(); } catch { /* 204 */ }
  return { status: res.status, data, setCookie: res.headers.get('set-cookie') || '' };
}
const login = async (email, role, portal = 'staff', password = PW) => (await call('POST', '/auth/login', { body: { email, password, portal, role } })).data.token;
const check = async (token, resource, action, ownerId) => (await call('POST', '/auth/check', { token, body: { resource, action, ownerId } })).data;

test('FR-02 sign-in rules', async (t) => {
  await t.test('correct staff sign-in returns a token', async () => assert.ok(await login('finance@team3.test', 'FINANCE')));
  await t.test('wrong password -> 401 generic', async () => {
    const r = await call('POST', '/auth/login', { body: { email: 'customer@team3.test', password: 'nope', portal: 'staff', role: 'CUSTOMER' } });
    assert.equal(r.status, 401); assert.match(r.data.message, /Incorrect email or password/);
  });
  await t.test('unknown email -> same 401 message', async () => {
    const r = await call('POST', '/auth/login', { body: { email: 'ghost@team3.test', password: PW, portal: 'staff', role: 'CUSTOMER' } });
    assert.equal(r.status, 401); assert.match(r.data.message, /Incorrect email or password/);
  });
  await t.test('finance on admin portal -> 401 WRONG_PORTAL', async () => {
    const r = await call('POST', '/auth/login', { body: { email: 'finance@team3.test', password: PW, portal: 'admin' } });
    assert.equal(r.status, 401); assert.equal(r.data.error, 'WRONG_PORTAL');
  });
  await t.test('finance picking SELLER -> 401 ROLE_MISMATCH with hint', async () => {
    const r = await call('POST', '/auth/login', { body: { email: 'finance@team3.test', password: PW, portal: 'staff', role: 'SELLER' } });
    assert.equal(r.data.error, 'ROLE_MISMATCH'); assert.equal(r.data.details.portalHint, 'FINANCE');
  });
  await t.test('admin on staff portal -> 401', async () => assert.equal((await call('POST', '/auth/login', { body: { email: 'admin@team3.test', password: PW, portal: 'staff', role: 'CUSTOMER' } })).status, 401));
  await t.test('staff portal without role -> 400', async () => assert.equal((await call('POST', '/auth/login', { body: { email: 'finance@team3.test', password: PW, portal: 'staff' } })).status, 400));
  await t.test('FR-06 deactivated account -> 401 INACTIVE', async () => assert.equal((await call('POST', '/auth/login', { body: { email: 'inactive@team3.test', password: PW, portal: 'staff', role: 'CUSTOMER' } })).data.error, 'INACTIVE'));
});

test('FR-01 register always creates a CUSTOMER', async () => {
  const r = await call('POST', '/auth/register', { body: { name: 'Test User', email: `t${Date.now()}@team3.test`, password: 'secret123', role: 'ADMIN' } });
  assert.equal(r.status, 201); assert.equal(r.data.user.role, 'CUSTOMER');
  const dup = await call('POST', '/auth/register', { body: { name: 'Again', email: 'customer@team3.test', password: 'secret123' } });
  assert.equal(dup.status, 409);
  const weak = await call('POST', '/auth/register', { body: { name: 'W', email: 'bad', password: 'short' } });
  assert.equal(weak.status, 400); assert.ok(weak.data.details.name && weak.data.details.email && weak.data.details.password);
});

test('FR-07/08 role tree and effective permissions', async () => {
  const me = (await call('GET', '/auth/me', { token: await login('finance@team3.test', 'FINANCE') })).data;
  assert.deepEqual(me.roleChain, ['FINANCE', 'EMPLOYEE']);
  assert.equal(me.grantedBy['product:read'], 'EMPLOYEE');
  assert.equal(me.grantedBy['refund:approve'], 'FINANCE');
});

test('FR-09 deny by default', async () => {
  assert.equal((await call('GET', '/auth/me')).status, 401);
  assert.equal((await call('GET', '/auth/me', { token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjF9.forged' })).status, 401);
  const customer = await login('customer@team3.test', 'CUSTOMER');
  assert.equal((await call('GET', '/admin/audit', { token: customer })).status, 403);
  const ceo = await login('ceo@team3.test', 'CEO');
  const r = await check(ceo, 'product', 'read');
  assert.equal(r.decision, 'DENY'); assert.equal(r.reason, 'NO_PERMISSION');
  assert.equal((await check(customer, 'spaceship', 'launch')).reason, 'NO_PERMISSION');
});

test('FR-10 ownership (Access Lab and a real write route)', async () => {
  const seller = await login('seller1@team3.test', 'SELLER');           // user #3
  assert.equal((await check(seller, 'product', 'update', 3)).reason, 'GRANTED_OWN');
  assert.equal((await check(seller, 'product', 'update', 4)).reason, 'NOT_OWNER');
  const mine = (await call('GET', '/seller/products', { token: seller })).data.products;
  assert.ok(mine.length > 0 && mine.every((p) => p.sellerId === 3));
  const own = await call('PATCH', `/catalog/products/${mine[0].id}`, { token: seller, body: { price: mine[0].price } });
  assert.equal(own.status, 200);
  const other = (await call('GET', '/catalog/products?limit=60')).data.products.find((p) => p.sellerId === 4);
  const deny = await call('PATCH', `/catalog/products/${other.id}`, { token: seller, body: { price: 1 } });
  assert.equal(deny.status, 403); assert.equal(deny.data.error, 'NOT_OWNER');
});

test('FR-07 admin rules: cycle rejected, no self role change', async () => {
  const admin = await login('admin@team3.test', null, 'admin');
  const cyc = await call('PUT', '/admin/roles/3/parent', { token: admin, body: { parentRoleId: 4 } });
  assert.equal(cyc.status, 409); assert.equal(cyc.data.error, 'CYCLE');
  assert.equal((await call('PUT', '/admin/users/1/role', { token: admin, body: { roleId: 1 } })).status, 403);
  const report = (await call('GET', '/admin/report', { token: admin })).data;
  assert.ok(report.warnings.some((w) => w.startsWith('CEO')));
});

test('Role change applies on the next request', async () => {
  const admin = await login('admin@team3.test', null, 'admin');
  const wh = await login('warehouse@team3.test', 'WAREHOUSE_STAFF');
  assert.equal((await check(wh, 'refund', 'approve')).decision, 'DENY');
  await call('PUT', '/admin/users/6/role', { token: admin, body: { roleId: 4 } });             // -> FINANCE
  assert.equal((await check(wh, 'refund', 'approve')).decision, 'ALLOW');                      // same token
  await call('PUT', '/admin/users/6/role', { token: admin, body: { roleId: 5 } });             // back
});

test('Session revocation: logout and deactivation kill old tokens', async () => {
  const t1 = await login('customer@team3.test', 'CUSTOMER');
  assert.equal((await call('POST', '/auth/logout', { token: t1 })).status, 204);
  assert.equal((await call('GET', '/auth/me', { token: t1 })).status, 401);

  const admin = await login('admin@team3.test', null, 'admin');
  const t2 = await login('seller2@team3.test', 'SELLER');
  await call('PUT', '/admin/users/4/active', { token: admin, body: { isActive: false } });
  assert.equal((await call('GET', '/auth/me', { token: t2 })).status, 401);
  await call('PUT', '/admin/users/4/active', { token: admin, body: { isActive: true } });
});

test('Lockout after 5 wrong passwords', async () => {
  const email = `lock${Date.now()}@team3.test`;
  await call('POST', '/auth/register', { body: { name: 'Lock Test', email, password: 'secret123' } });
  for (let i = 0; i < 5; i += 1) await call('POST', '/auth/login', { body: { email, password: 'wrong', portal: 'staff', role: 'CUSTOMER' } });
  const r = await call('POST', '/auth/login', { body: { email, password: 'secret123', portal: 'staff', role: 'CUSTOMER' } });
  assert.equal(r.status, 429); assert.equal(r.data.error, 'LOCKED');
});

test('Lockout cannot shut out the real owner: a known device still gets in', async () => {
  const email = `owner${Date.now()}@team3.test`;
  const pw = 'secret123';
  await call('POST', '/auth/register', { body: { name: 'Real Owner', email, password: pw } });
  const first = await call('POST', '/auth/login', { body: { email, password: pw, portal: 'staff', role: 'CUSTOMER' } });
  assert.equal(first.status, 200);
  assert.match(first.setCookie, /t3_device=/); assert.match(first.setCookie, /HttpOnly/i);
  const cookie = first.setCookie.split(';')[0];
  for (let i = 0; i < 5; i += 1) await call('POST', '/auth/login', { body: { email, password: 'wrong', portal: 'staff', role: 'CUSTOMER' } });
  const attacker = await call('POST', '/auth/login', { body: { email, password: pw, portal: 'staff', role: 'CUSTOMER' } });
  assert.equal(attacker.status, 429); assert.equal(attacker.data.error, 'LOCKED');
  const forged = await call('POST', '/auth/login', { cookie: cookie.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')), body: { email, password: pw, portal: 'staff', role: 'CUSTOMER' } });
  assert.equal(forged.status, 429, 'a tampered device cookie is treated as an unknown device');
  const owner = await call('POST', '/auth/login', { cookie, body: { email, password: pw, portal: 'staff', role: 'CUSTOMER' } });
  assert.equal(owner.status, 200, 'the real owner on a known device gets in during the lock');
});

test('Known device still needs the right password', async () => {
  const first = await call('POST', '/auth/login', { body: { email: 'seller2@team3.test', password: PW, portal: 'staff', role: 'SELLER' } });
  const cookie = first.setCookie.split(';')[0];
  const r = await call('POST', '/auth/login', { cookie, body: { email: 'seller2@team3.test', password: 'nope', portal: 'staff', role: 'SELLER' } });
  assert.equal(r.status, 401);
});

test('FR-11 every decision is audited', async () => {
  const admin = await login('admin@team3.test', null, 'admin');
  const { entries } = (await call('GET', '/admin/audit?decision=DENY&pageSize=100', { token: admin })).data;
  const reasons = new Set(entries.map((e) => e.reason));
  ['NOT_OWNER', 'NO_PERMISSION', 'ROLE_MISMATCH', 'WRONG_PORTAL', 'BAD_CREDENTIALS'].forEach((x) => assert.ok(reasons.has(x), x));
});

test('E1 typo search corrects misspellings', async () => {
  const r = (await call('GET', '/catalog/products?q=headphnes')).data;
  assert.equal(r.correctedQuery, 'headphones'); assert.ok(r.products.length > 0);
});
