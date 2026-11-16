/**
 * E1 · sessions: JWT (HS256) carrying only { sub: userId, tv: tokenVersion }, valid 2 hours.
 *
 * The role is NOT in the token. authenticate() re-reads the user on every request, so:
 *   - a role change applies on the user's very next request
 *   - deactivating an account, logging out or changing the password bumps token_version,
 *     which makes every older token fail with 401 (this is how a stateless JWT gets revoked)
 */
const jwt = require('jsonwebtoken');
const data = require('../e3-data');
const { HttpError } = require('../../core/http');
const { authorize } = require('./authorize');

const config = require('../../config');

const SECRET = config.jwt.secret;
const TTL = config.jwt.ttl;

const sign = (user) => jwt.sign({ sub: user.id, tv: user.tokenVersion }, SECRET, { algorithm: 'HS256', expiresIn: TTL });

/** Sets req.user when a valid token is present. Does not reject anonymous calls (guard() does that). */
async function authenticate(req, _res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return next();
  try {
    const payload = jwt.verify(h.slice(7), SECRET, { algorithms: ['HS256'] });
    const user = await data.users.byId(payload.sub);
    if (!user || !user.isActive || user.tokenVersion !== payload.tv) return next(new HttpError(401, 'SESSION_ENDED', 'Your session has ended. Please sign in again.'));
    req.user = user;
    return next();
  } catch (e) {
    if (e instanceof HttpError) return next(e);
    if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError') return next(new HttpError(401, 'BAD_TOKEN', 'Your session has ended. Please sign in again.'));
    return next(e);
  }
}

/** Any signed-in user. */
function requireUser(req, _res, next) {
  if (!req.user) return next(new HttpError(401, 'NO_TOKEN', 'Please sign in first.'));
  return next();
}

/**
 * Route guard. ownerOf(req) may return the owning user id of the row being touched (FR-10),
 * or a Promise of it. The decision comes from authorize(); this only turns DENY into 401/403.
 */
function guard(resource, action, ownerOf) {
  return async (req, _res, next) => {
    try {
      if (!req.user) {
        await authorize(null, resource, action, { ip: req.ip });
        throw new HttpError(401, 'NO_TOKEN', 'Please sign in first.');
      }
      const ownerId = ownerOf ? await ownerOf(req) : null;
      const r = await authorize(req.user, resource, action, { ownerId, ip: req.ip });
      req.decision = r;
      if (r.decision === 'ALLOW') return next();
      if (r.reason === 'FAIL_CLOSED') throw new HttpError(503, 'FAIL_CLOSED', 'Access checks are unavailable right now. Try again shortly.');
      throw new HttpError(403, r.reason, r.reason === 'NOT_OWNER'
        ? 'You can only change items that belong to you.'
        : `Your role (${req.user.role}) is not allowed to do this.`);
    } catch (e) { next(e); }
  };
}

module.exports = { sign, authenticate, requireUser, guard };
