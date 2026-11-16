/**
 * E1 · /api/auth — sign-up, sign-in, session, and "what may I do".
 * FR-01 register · FR-02 sign in · FR-06 deactivated accounts · FR-08 effective permissions
 * FR-09 deny by default · FR-10 ownership · FR-11 audit
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const data = require('../e3-data');
const cache = require('./permissionCache');
const { authorize, auditLogin } = require('./authorize');
const { sign, requireUser, guard } = require('./session');
const loginGuard = require('./loginGuard');
const config = require('../../config');
const { HttpError, wrap, validator, EMAIL, toInt } = require('../../core/http');

const r = express.Router();
const DUMMY_HASH = '$2b$10$KIMPw0dfl5svl90Qyva9aesnZeCvQ6lUrRl14FDBu2JTvWRMJ24ly';
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

function meOf(user) {
  const { permissions, grantedBy } = cache.permissionsOf(user.roleId);
  return { user: publicUser(user), roleChain: cache.chainOf(user.roleId), permissions, grantedBy };
}

/** FR-01: always CUSTOMER. Any "role" field in the body is ignored. */
r.post('/register', wrap(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  validator()
    .check(name.length >= 2 && name.length <= 80, 'name', 'must be 2–80 characters')
    .check(EMAIL.test(email), 'email', 'is not a valid address')
    .check(password.length >= 8, 'password', 'must be at least 8 characters')
    .check(/[A-Za-z]/.test(password) && /\d/.test(password), 'password', 'needs at least one letter and one number')
    .throwIfAny();
  if (await data.users.byEmailWithHash(email)) throw new HttpError(409, 'EMAIL_TAKEN', 'An account with this email already exists.', { email: 'is already registered' });
  const id = await data.users.create({ name, email, passwordHash: await bcrypt.hash(password, config.bcryptCost), roleId: cache.state.byName.get('CUSTOMER') });
  const user = await data.users.byId(id);
  await auditLogin(user, email, 'ALLOW', 'REGISTERED', req.ip);
  res.status(201).json({ user: publicUser(user) });
}));

/**
 * FR-02: two portals.
 *   admin  -> only ADMIN accounts
 *   staff  -> everyone else, and the role picked on the sign-in page must equal the account's role
 * The role always comes from the database, never from the form: the form value is only compared.
 */
r.post('/login', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const portal = req.body.portal === 'admin' ? 'admin' : 'staff';
  const picked = req.body.role ? String(req.body.role) : '';
  validator()
    .check(EMAIL.test(email), 'email', 'is not a valid address')
    .check(password.length > 0, 'password', 'is required')
    .check(portal === 'admin' || picked, 'role', 'Choose the role you sign in as')
    .throwIfAny();

  const user = await data.users.byEmailWithHash(email);
  const fail = async (status, reason, message, extra) => {
    await auditLogin(user, email, 'DENY', reason, req.ip);
    throw new HttpError(status, reason, message, extra);
  };
  const lockAfter = config.login.accountLockAfter;
  const lockMinutes = config.login.lockMinutes;

  // Layer 1: too many wrong passwords from this IP address -> block the IP, not anyone's account.
  if (loginGuard.ipBlocked(req.ip)) await fail(429, 'IP_LIMIT', `Too many sign-in attempts from your network. Please wait ${config.login.ipWindowMinutes} minutes and try again.`);

  // A browser that signed in to this account before is "known": the account lock below never blocks it.
  const known = !!user && loginGuard.isKnownDevice(req, user.id);

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);            // same time as a real check: timing can't reveal which emails exist
    loginGuard.recordIpFailure(req.ip);
    await fail(401, 'BAD_CREDENTIALS', 'Incorrect email or password.');
  }
  // Layer 2: account locked for UNKNOWN devices only, so an attacker can't lock the real owner out.
  if (user.isLocked && !known) await fail(429, 'LOCKED', `Too many wrong passwords for this account from new devices. Sign in from a device you've used before, or wait ${lockMinutes} minutes.`);
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    loginGuard.recordIpFailure(req.ip);
    if (!known) await data.users.recordFailure(user.id, lockAfter, lockMinutes);
    const left = lockAfter - 1 - user.failedLogins;
    await fail(401, 'BAD_CREDENTIALS', !known && left <= 2 && left > 0 ? `Incorrect email or password. ${left} attempt${left === 1 ? '' : 's'} left before a ${lockMinutes}-minute lock.` : 'Incorrect email or password.');
  }
  if (!user.isActive) await fail(401, 'INACTIVE', 'This account has been deactivated. Contact support to restore it.');
  if (portal === 'admin' && user.role !== 'ADMIN') await fail(401, 'WRONG_PORTAL', 'This account cannot use the admin console.', { portalHint: user.role });
  if (portal === 'staff' && user.role === 'ADMIN') await fail(401, 'WRONG_PORTAL', 'Administrators sign in through the admin console.', { portalHint: 'ADMIN' });
  if (portal === 'staff' && picked !== user.role) await fail(401, 'ROLE_MISMATCH', 'This account is not registered for this sign-in page.', { portalHint: user.role });

  await data.users.clearFailures(user.id);
  loginGuard.rememberDevice(req, res, user.id);           // this browser is now a known device for this account
  await auditLogin(user, email, 'ALLOW', known ? 'GRANTED_KNOWN_DEVICE' : 'GRANTED', req.ip);
  res.json({ token: sign(user), user: publicUser(user) });
}));

/** Roles offered on the staff sign-in page (roles.staff_login = 1). Public: no account data. */
r.get('/staff-roles', (_req, res) => {
  const roles = [...cache.state.roles.values()].filter((x) => x.staffLogin).map((x) => ({ name: x.name, description: x.description }));
  res.json({ roles });
});

r.get('/me', requireUser, (req, res) => res.json(meOf(req.user)));

/** Logout = bump token_version: this token and any copy of it stop working at once. */
r.post('/logout', requireUser, wrap(async (req, res) => {
  await data.users.bumpTokenVersion(req.user.id);
  await auditLogin(req.user, req.user.email, 'ALLOW', 'LOGOUT', req.ip);
  res.status(204).end();
}));

r.put('/profile', requireUser, guard('user', 'update_own', (req) => req.user.id), wrap(async (req, res) => {
  const name = String(req.body.name || '').trim();
  validator().check(name.length >= 2 && name.length <= 80, 'name', 'must be 2–80 characters').throwIfAny();
  await data.users.updateName(req.user.id, name);
  res.json(meOf(await data.users.byId(req.user.id)));
}));

/** Change password: needs the current one; signs out every other device (token_version bump) and returns a fresh token. */
r.put('/password', requireUser, guard('user', 'update_own', (req) => req.user.id), wrap(async (req, res) => {
  const current = String(req.body.currentPassword || '');
  const next = String(req.body.newPassword || '');
  validator()
    .check(current.length > 0, 'currentPassword', 'is required')
    .check(next.length >= 8, 'newPassword', 'must be at least 8 characters')
    .check(/[A-Za-z]/.test(next) && /\d/.test(next), 'newPassword', 'needs at least one letter and one number')
    .check(next !== current, 'newPassword', 'must be different from the current one')
    .throwIfAny();
  if (!(await bcrypt.compare(current, await data.users.hashById(req.user.id)))) {
    throw new HttpError(400, 'VALIDATION', 'Please fix the highlighted fields.', { currentPassword: 'is incorrect' });
  }
  await data.users.setPassword(req.user.id, await bcrypt.hash(next, config.bcryptCost));
  res.json({ token: sign(await data.users.byId(req.user.id)) });
}));

/** The caller's own last 15 decisions. */
r.get('/activity', requireUser, wrap(async (req, res) => {
  const { entries } = await data.audit.page({ page: 1, pageSize: 15, userId: req.user.id });
  res.json({ entries });
}));

r.get('/permission-catalog', requireUser, wrap(async (_req, res) => {
  res.json({ permissions: await data.permissions.all() });
}));

/** Access Lab: run the real authorize() for any resource:action (+ optional row owner). Audited like any route. */
r.post('/check', requireUser, wrap(async (req, res) => {
  const resource = String(req.body.resource || '');
  const action = String(req.body.action || '');
  const ownerId = toInt(req.body.ownerId);
  validator()
    .check(/^[a-z_]{1,40}$/.test(resource), 'resource', 'must be lower-case letters')
    .check(/^[a-z_]{1,40}$/.test(action), 'action', 'must be lower-case letters')
    .check(!Number.isNaN(ownerId), 'ownerId', 'must be a whole number')
    .throwIfAny();
  const t0 = process.hrtime.bigint();
  const result = await authorize(req.user, resource, action, { ownerId, ip: req.ip });
  res.json({ ...result, tookMs: Math.round(Number(process.hrtime.bigint() - t0) / 1e4) / 100 });
}));

module.exports = r;
