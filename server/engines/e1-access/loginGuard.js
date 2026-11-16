/**
 * E1 · sign-in protection (OS: sliding-window counters; crypto: HMAC-signed device tokens).
 *
 * Two layers, so an attacker can't lock real users out:
 *  1. Per-IP limit: too many wrong passwords from one IP address in the window -> that IP gets 429.
 *     This stops guessing without touching anyone's account.
 *  2. Account lock for UNKNOWN devices only: after N wrong passwords from browsers that never signed in
 *     to this account, the account locks for 15 minutes for new devices. A browser that has signed in
 *     successfully before carries a signed "trusted device" cookie and is never blocked by that lock,
 *     so the real owner still gets in while an attacker is hammering the account.
 *
 * The device cookie is httpOnly (page scripts can't read it), SameSite=Lax, and Secure in production
 * (only sent over HTTPS). It proves "this browser signed in as user N before"; it is NOT a login:
 * the password is still required every time.
 */
const crypto = require('crypto');
const config = require('../../config');

const COOKIE = 't3_device';
const MAX_ACCOUNTS_PER_BROWSER = 5;

/* ---------- 1. per-IP sliding window (in memory: fine for one server; see "known limits") ---------- */
const failures = new Map(); // ip -> [timestamps]
const windowMs = () => config.login.ipWindowMinutes * 60 * 1000;

function prune(ip, now = Date.now()) {
  const list = (failures.get(ip) || []).filter((t) => now - t < windowMs());
  if (list.length) failures.set(ip, list); else failures.delete(ip);
  return list;
}
const ipBlocked = (ip) => prune(ip).length >= config.login.ipLimit;
function recordIpFailure(ip) {
  const list = prune(ip);
  list.push(Date.now());
  failures.set(ip, list);
}
setInterval(() => { for (const ip of failures.keys()) prune(ip); }, 60 * 1000).unref();

/* ---------- 2. trusted-device cookie ---------- */
const sign = (userId, deviceId) => crypto.createHmac('sha256', config.jwt.secret).update(`device:${userId}:${deviceId}`).digest('base64url');
const safeEqual = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

function readCookie(req) {
  const header = req.headers.cookie || '';
  const part = header.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE}=`));
  return part ? decodeURIComponent(part.slice(COOKIE.length + 1)) : '';
}
/** Valid entries in this browser's cookie: [{ userId, deviceId, sig }] (bad signatures are dropped). */
function entries(req) {
  return readCookie(req).split('|').filter(Boolean).map((e) => {
    const [uid, deviceId, sig] = e.split('.');
    const userId = Number(uid);
    return Number.isInteger(userId) && deviceId && sig && safeEqual(sig, sign(userId, deviceId)) ? { userId, deviceId, sig } : null;
  }).filter(Boolean);
}
const isKnownDevice = (req, userId) => entries(req).some((e) => e.userId === userId);

/** After a successful sign-in: remember this browser for this account (keeps up to 5 accounts per browser). */
function rememberDevice(req, res, userId) {
  const others = entries(req).filter((e) => e.userId !== userId).slice(-(MAX_ACCOUNTS_PER_BROWSER - 1));
  const deviceId = crypto.randomBytes(12).toString('base64url');
  const value = [...others.map((e) => `${e.userId}.${e.deviceId}.${e.sig}`), `${userId}.${deviceId}.${sign(userId, deviceId)}`].join('|');
  res.cookie(COOKIE, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.secureCookies,
    path: '/api/auth',
    maxAge: config.login.deviceDays * 24 * 60 * 60 * 1000,
  });
}

module.exports = { ipBlocked, recordIpFailure, isKnownDevice, rememberDevice };
