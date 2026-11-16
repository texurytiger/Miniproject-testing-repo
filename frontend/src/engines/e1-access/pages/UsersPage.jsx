import { useEffect, useState } from 'react';
import { useAuth } from '../../../app/AuthContext';
import { api } from '../../../app/api';
import { initials } from '../../../app/Icons';
import { Alert, PageHead } from './shared';

/** FR-07 / UC-E1-06 Assign Role to User. Takes effect on the user's very next request. */
export default function UsersPage() {
  const { me, can } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [msg, setMsg] = useState(null);
  const [filter, setFilter] = useState('');

  const load = async () => {
    const [u, r] = await Promise.all([api('/admin/users'), api('/admin/roles')]);
    setUsers(u.users); setRoles(r.roles);
  };
  useEffect(() => { load().catch((e) => setMsg({ type: 'error', text: e.message })); }, []);

  async function assign(user, roleId) {
    setMsg(null);
    try {
      const { user: updated } = await api(`/admin/users/${user.id}/role`, { method: 'PUT', body: { roleId: Number(roleId) } });
      setUsers((list) => list.map((u) => (u.id === updated.id ? updated : u)));
      setMsg({ type: 'ok', text: `${updated.email} is now ${updated.role}. It applies on their very next request.` });
    } catch (err) {
      setMsg({ type: 'error', text: `${err.status}: ${err.message}` });
    }
  }

  async function toggleActive(user) {
    setMsg(null);
    try {
      const { user: updated } = await api(`/admin/users/${user.id}/active`, { method: 'PUT', body: { isActive: !user.isActive } });
      setUsers((list) => list.map((u) => (u.id === updated.id ? { ...u, ...updated, locked: false } : u)));
      setMsg({ type: 'ok', text: updated.isActive ? `${updated.email} can sign in again.` : `${updated.email} is deactivated. Their open sessions ended immediately.` });
    } catch (err) {
      setMsg({ type: 'error', text: `${err.status}: ${err.message}` });
    }
  }

  const shown = users.filter((u) => `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="stack">
      <PageHead title="Users" fr="FR-06 · FR-07" lead="Change a user's role or deactivate an account. It applies on their very next request, because E1 re-reads the role every time. You cannot change your own role (lock-out guard).">
        <input className="compact" placeholder="Filter by name, email, role" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter users" style={{ width: 260 }} />
      </PageHead>
      <Alert msg={msg} />
      <section className="card flush">
        <table className="table">
          <thead><tr><th>User</th><th>Status</th><th>Role</th><th className="right">ID</th></tr></thead>
          <tbody>
            {shown.map((u) => (
              <tr key={u.id}>
                <td><div className="user-cell"><div className="avatar">{initials(u.name)}</div><div><b>{u.name}{u.id === me.user.id && <span className="badge role" style={{ marginLeft: 8 }}>you</span>}</b><span>{u.email}</span></div></div></td>
                <td>
                  <span className={`badge dot ${u.isActive ? 'allow' : 'deny'}`}>{u.isActive ? 'active' : 'deactivated'}</span>
                  {u.locked && <span className="badge warn" style={{ marginLeft: 6 }}>locked 15 min</span>}
                  {can('user:deactivate') && u.id !== me.user.id && (
                    <button className="btn small ghost" style={{ marginLeft: 6 }} onClick={() => toggleActive(u)}>{u.isActive ? 'Deactivate' : 'Reactivate'}</button>
                  )}
                </td>
                <td>
                  <select className="compact" value={u.roleId} onChange={(e) => assign(u, e.target.value)} aria-label={`Role for ${u.email}`} disabled={u.id === me.user.id}>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </td>
                <td className="right muted mono">#{u.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
