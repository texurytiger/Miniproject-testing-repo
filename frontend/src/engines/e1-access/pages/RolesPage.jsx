import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../app/api';
import { Alert, PageHead } from './shared';

/** Depth-first order with depth, so the role tree reads top-down. */
function treeOrder(roles) {
  const kids = new Map();
  roles.forEach((r) => { const k = r.parentRoleId ?? 0; if (!kids.has(k)) kids.set(k, []); kids.get(k).push(r); });
  const out = []; const seen = new Set();
  const walk = (parent, depth) => (kids.get(parent) || []).forEach((r) => {
    if (seen.has(r.id)) return; seen.add(r.id);
    out.push({ ...r, depth }); walk(r.id, depth + 1);
  });
  walk(0, 0);
  roles.forEach((r) => !seen.has(r.id) && out.push({ ...r, depth: 0 }));
  return out;
}

/** FR-07 / UC-E1-05 Manage Roles & Permissions (role tree; cycles rejected with 409). */
export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [perms, setPerms] = useState([]);
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState(null);
  const [draft, setDraft] = useState(new Set());
  const [newRole, setNewRole] = useState({ name: '', parentRoleId: '' });

  const load = async (keepId) => {
    const [r, p] = await Promise.all([api('/admin/roles'), api('/admin/permissions')]);
    setRoles(r.roles); setPerms(p.permissions);
    const id = keepId ?? selected ?? r.roles[0]?.id;
    const role = r.roles.find((x) => x.id === id);
    setSelected(id);
    setDraft(new Set(role ? role.directPermissions : []));
  };
  useEffect(() => { load().catch((e) => setMsg({ type: 'error', text: e.message })); }, []);

  const ordered = useMemo(() => treeOrder(roles), [roles]);
  const role = roles.find((r) => r.id === selected);
  const pick = (r) => { setSelected(r.id); setDraft(new Set(r.directPermissions)); setMsg(null); };
  const report = (err) => setMsg({ type: 'error', text: `${err.status}: ${err.message}` });

  async function changeParent(value) {
    setMsg(null);
    try {
      await api(`/admin/roles/${role.id}/parent`, { method: 'PUT', body: { parentRoleId: value ? Number(value) : null } });
      await load(role.id);
      setMsg({ type: 'ok', text: 'Parent changed. Permission cache rebuilt.' });
    } catch (err) { report(err); }
  }

  async function savePermissions() {
    setMsg(null);
    const key = (p) => `${p.resource}:${p.action}`;
    const before = new Set(role.directPermissions);
    const grant = perms.filter((p) => draft.has(key(p)) && !before.has(key(p))).map((p) => p.id);
    const revoke = perms.filter((p) => !draft.has(key(p)) && before.has(key(p))).map((p) => p.id);
    if (!grant.length && !revoke.length) return setMsg({ type: 'info', text: 'No changes.' });
    try {
      await api(`/admin/roles/${role.id}/permissions`, { method: 'PUT', body: { grant, revoke } });
      await load(role.id);
      setMsg({ type: 'ok', text: `Saved: +${grant.length} / −${revoke.length}. Effective immediately.` });
    } catch (err) { report(err); setDraft(new Set(role.directPermissions)); }
  }

  async function createRole(e) {
    e.preventDefault(); setMsg(null);
    try {
      const { id } = await api('/admin/roles', { method: 'POST', body: { name: newRole.name, ...(newRole.parentRoleId ? { parentRoleId: Number(newRole.parentRoleId) } : {}) } });
      setNewRole({ name: '', parentRoleId: '' });
      await load(id);
      setMsg({ type: 'ok', text: 'Role created.' });
    } catch (err) { setMsg({ type: 'error', text: err.details ? Object.values(err.details).join(', ') : `${err.status}: ${err.message}` }); }
  }

  const byResource = perms.reduce((m, p) => { (m[p.resource] ||= []).push(p); return m; }, {});
  const inherited = role ? new Set(role.effectivePermissions.filter((p) => !role.directPermissions.includes(p))) : new Set();

  return (
    <div className="stack">
      <PageHead title="Roles" fr="FR-07" lead="A child role inherits everything its parent has. Try making EMPLOYEE a child of FINANCE: the server rejects the cycle with 409." />
      <Alert msg={msg} />

      <div className="grid roles">
        <section className="card flush">
          <div className="tree">
            {ordered.map((r) => (
              <button key={r.id} className={`tree-row ${r.id === selected ? 'active' : ''}`} style={{ paddingLeft: 16 + r.depth * 22 }} onClick={() => pick(r)}>
                {r.depth > 0 && <span className="elbow">└</span>}
                <span className="tree-name">{r.name}</span>
                <span className="muted small">{r.effectivePermissions.length}</span>
              </button>
            ))}
          </div>
          <form className="new-role" onSubmit={createRole}>
            <input className="compact" placeholder="NEW_ROLE" value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} aria-label="New role name" />
            <select className="compact" value={newRole.parentRoleId} onChange={(e) => setNewRole({ ...newRole, parentRoleId: e.target.value })} aria-label="Parent of new role">
              <option value="">no parent</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button className="btn small" disabled={!newRole.name}>Add role</button>
          </form>
        </section>

        {role && (
          <section className="card">
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div>
                <h2>{role.name}</h2>
                <p className="muted small">{role.description || '—'} · {role.effectivePermissions.length} effective permissions</p>
              </div>
              <span className="spacer" />
              <label className="field" style={{ minWidth: 200 }}>Parent role
                <select className="compact" value={role.parentRoleId ?? ''} onChange={(e) => changeParent(e.target.value)}>
                  <option value="">none</option>
                  {roles.filter((r) => r.id !== role.id).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </label>
            </div>
            <div className="perm-grid">
              {Object.entries(byResource).map(([resource, list]) => (
                <div key={resource} className="perm-group">
                  <div className="perm-res">{resource}</div>
                  {list.map((p) => {
                    const k = `${p.resource}:${p.action}`;
                    const isInherited = inherited.has(k);
                    return (
                      <label key={k} className={`check ${isInherited ? 'inh' : ''}`}>
                        <input type="checkbox" checked={draft.has(k) || isInherited} disabled={isInherited}
                          onChange={(e) => { const d = new Set(draft); if (e.target.checked) d.add(k); else d.delete(k); setDraft(d); }} />
                        {p.action}{isInherited && <span className="via">inherited</span>}
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="actions">
              <button className="btn primary" onClick={savePermissions}>Save permissions</button>
              <button className="btn ghost" onClick={() => setDraft(new Set(role.directPermissions))}>Reset</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
