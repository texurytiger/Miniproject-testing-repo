/**
 * E1 · authorize() — the single decision point every protected route goes through.
 *
 *   ALLOW  GRANTED       the role (or an ancestor) holds resource:action
 *   ALLOW  GRANTED_OWN   only resource:action_own is held, and the row belongs to the caller
 *   DENY   NOT_OWNER     only resource:action_own is held, and the row belongs to someone else (or is unknown)
 *   DENY   NO_PERMISSION nothing in the role chain grants it  -> deny by default
 *   DENY   NO_TOKEN      anonymous caller
 *   DENY   FAIL_CLOSED   cache not built or the audit write failed -> refuse rather than guess
 *
 * Every decision is written to audit_log BEFORE it is returned. If that write fails, the answer becomes DENY.
 */
const cache = require('./permissionCache');
const data = require('../e3-data');

function decide(user, resource, action, ownerId) {
  if (!user) return ['DENY', 'NO_TOKEN'];
  if (!cache.state.ready) return ['DENY', 'FAIL_CLOSED'];
  const perm = `${resource}:${action}`;

  // Asking for an _own action directly (e.g. update_own): held + (no owner given or owner is me).
  if (action.endsWith('_own')) {
    if (!cache.has(user.roleId, perm)) return ['DENY', 'NO_PERMISSION'];
    return ownerId == null || ownerId === user.id ? ['ALLOW', 'GRANTED_OWN'] : ['DENY', 'NOT_OWNER'];
  }
  if (cache.has(user.roleId, perm)) return ['ALLOW', 'GRANTED'];                 // O(1) hash lookup
  if (cache.has(user.roleId, `${perm}_own`)) {                                    // O(1) fallback to the _own grant
    return ownerId != null && ownerId === user.id ? ['ALLOW', 'GRANTED_OWN'] : ['DENY', 'NOT_OWNER'];
  }
  return ['DENY', 'NO_PERMISSION'];
}

async function authorize(user, resource, action, { ownerId = null, ip = null } = {}) {
  let [decision, reason] = decide(user, resource, action, ownerId);
  try {
    await data.audit.insert({ userId: user && user.id, email: user && user.email, resource, action, ownerId, decision, reason, ip });
  } catch (e) {
    console.error('[E1] audit write failed, failing closed:', e.message);
    [decision, reason] = ['DENY', 'FAIL_CLOSED'];
  }
  return { decision, reason, resource, action, ownerId };
}

/** Audit a sign-in attempt (resource session:login). Never blocks the login answer itself. */
async function auditLogin(user, email, decision, reason, ip) {
  try {
    await data.audit.insert({ userId: user && user.id, email: (user && user.email) || email, resource: 'session', action: 'login', decision, reason, ip });
  } catch (e) { console.error('[E1] audit write failed:', e.message); }
}

module.exports = { authorize, decide, auditLogin };
