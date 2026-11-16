/**
 * E1 · Permission cache (DAA).
 *
 * build():  one depth-first walk down the role tree. Each role's effective permission set =
 *           its own grants ∪ its parent's effective set. Stored as Map<roleId, Map<perm, grantingRole>>,
 *           so every authorize() call is ONE hash lookup: O(1), no matter how deep the tree is.
 *           Cost of a rebuild: O(R + G) for R roles and G grants. It only runs at startup and after an admin edit.
 *
 * Roles not reachable from any root are stuck in a cycle. They get an EMPTY set (fail closed) and are reported.
 * wouldCreateCycle(): DFS over a role's descendants before any parent change, so a cycle can never be saved.
 */
const data = require('../e3-data');

const state = {
  ready: false,
  roles: new Map(),       // id -> { id, name, description, parentRoleId, staffLogin }
  byName: new Map(),      // name -> id
  direct: new Map(),      // id -> Set(perm)
  effective: new Map(),   // id -> Map(perm -> name of the role that grants it, nearest first)
  children: new Map(),    // id -> [childId]
  cycles: [],             // names of roles caught in a cycle
  builtAt: null,
  buildMs: 0,
};

async function build() {
  const t0 = process.hrtime.bigint();
  const [roleRows, grantRows] = await Promise.all([data.roles.all(), data.roles.grants()]);

  const roles = new Map(roleRows.map((r) => [r.id, r]));
  const direct = new Map(roleRows.map((r) => [r.id, new Set()]));
  grantRows.forEach((g) => direct.get(g.roleId) && direct.get(g.roleId).add(g.perm));

  const children = new Map(roleRows.map((r) => [r.id, []]));
  const roots = [];
  roleRows.forEach((r) => (r.parentRoleId && roles.has(r.parentRoleId) ? children.get(r.parentRoleId).push(r.id) : roots.push(r.id)));

  // Iterative DFS from every root, carrying the parent's effective map down.
  const effective = new Map();
  const stack = roots.map((id) => [id, new Map()]);
  while (stack.length) {
    const [id, inherited] = stack.pop();
    const mine = new Map(inherited);                       // copy parent's set
    direct.get(id).forEach((p) => mine.set(p, roles.get(id).name)); // own grants win the "granted by" label
    effective.set(id, mine);
    children.get(id).forEach((c) => stack.push([c, mine]));
  }

  const cycles = roleRows.filter((r) => !effective.has(r.id)).map((r) => r.name);
  cycles.forEach((name) => effective.set(roleRows.find((r) => r.name === name).id, new Map()));

  Object.assign(state, {
    ready: true, roles, direct, effective, children, cycles,
    byName: new Map(roleRows.map((r) => [r.name, r.id])),
    builtAt: new Date(), buildMs: Number(process.hrtime.bigint() - t0) / 1e6,
  });
  return state;
}

/** Same build, but a failure leaves the cache NOT ready, so authorize() fails closed. */
async function rebuild() {
  try { return await build(); } catch (e) { state.ready = false; throw e; }
}

/** O(1): does this role hold this exact permission (directly or inherited)? */
const has = (roleId, perm) => !!state.effective.get(roleId) && state.effective.get(roleId).has(perm);
const grantedBy = (roleId, perm) => state.effective.get(roleId) && state.effective.get(roleId).get(perm);

function permissionsOf(roleId) {
  const m = state.effective.get(roleId) || new Map();
  return { permissions: [...m.keys()].sort(), grantedBy: Object.fromEntries(m) };
}

/** Role chain from the role up to its root, e.g. FINANCE -> EMPLOYEE. */
function chainOf(roleId) {
  const out = []; const seen = new Set();
  let cur = state.roles.get(roleId);
  while (cur && !seen.has(cur.id)) { seen.add(cur.id); out.push(cur.name); cur = state.roles.get(cur.parentRoleId); }
  return out;
}

/** DFS over roleId's subtree: making newParent the parent creates a cycle if newParent is roleId or below it. */
function wouldCreateCycle(roleId, newParentId) {
  if (newParentId === null) return false;
  if (newParentId === roleId) return true;
  const stack = [roleId]; const seen = new Set();
  while (stack.length) {
    const id = stack.pop();
    if (id === newParentId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    (state.children.get(id) || []).forEach((c) => stack.push(c));
  }
  return false;
}

function depthOf(roleId) { return chainOf(roleId).length - 1; }

module.exports = { state, build, rebuild, has, grantedBy, permissionsOf, chainOf, wouldCreateCycle, depthOf };
