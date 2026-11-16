import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../../../app/AuthContext';
import { api } from '../../../app/api';
import Icon from '../../../app/Icons';
import { PasswordInput } from '../auth/shared';
import { Decision, fmtTime } from './shared';

const TILES = [
  { id: 'orders', icon: 'box', title: 'Your orders', sub: 'Track, return or buy things again' },
  { id: 'security', icon: 'lock', title: 'Login & security', sub: 'Edit name, change password, sign out' },
  { id: 'access', icon: 'shield', title: 'Your access', sub: 'Your role and exactly what it allows' },
];

function Security() {
  const { me, updateName, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(me.user.name);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState(null);
  const [errs, setErrs] = useState({});

  async function saveName(e) {
    e.preventDefault(); setMsg(null); setErrs({});
    try { await updateName(name.trim()); setMsg({ ok: true, text: 'Name updated.' }); } catch (err) { setErrs(err.details || {}); setMsg({ ok: false, text: err.message }); }
  }
  async function savePw(e) {
    e.preventDefault(); setMsg(null); setErrs({});
    try {
      await changePassword(pw.currentPassword, pw.newPassword);
      setPw({ currentPassword: '', newPassword: '' });
      setMsg({ ok: true, text: 'Password changed. Every other device has been signed out.' });
    } catch (err) { setErrs(err.details || {}); setMsg({ ok: false, text: err.message }); }
  }

  return (
    <section className="acc-sec" id="security">
      <h2>Login &amp; security</h2>
      {msg && <div className={`alert ${msg.ok ? 'ok' : 'error'}`}><Icon name={msg.ok ? 'check' : 'alert'} />{msg.text}</div>}
      <div className="sec-list">
        <form className="sec-row" onSubmit={saveName}>
          <div><b>Name</b><span>{me.user.name}</span></div>
          <div className="sec-edit"><input value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" /><button className="btn small" disabled={name.trim() === me.user.name}>Save</button></div>
          {errs.name && <span className="field-error">Name {errs.name}</span>}
        </form>
        <div className="sec-row"><div><b>Email</b><span>{me.user.email}</span></div><span className="muted small">Your sign-in ID. Contact support to change it.</span></div>
        <form className="sec-row" onSubmit={savePw}>
          <div><b>Password</b><span>Stored as a bcrypt hash. Changing it signs out every other device.</span></div>
          <div className="sec-pw">
            <PasswordInput value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} id="cur" placeholder="Current password" />
            <PasswordInput value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} autoComplete="new-password" id="new" placeholder="New password" />
            <button className="btn small" disabled={!pw.currentPassword || !pw.newPassword}>Change password</button>
          </div>
          {errs.currentPassword && <span className="field-error">Current password {errs.currentPassword}</span>}
          {errs.newPassword && <span className="field-error">New password {errs.newPassword}</span>}
        </form>
        <div className="sec-row">
          <div><b>Sign out everywhere</b><span>Ends this session and every other one. Old tokens stop working at once.</span></div>
          <button className="btn small" onClick={async () => { await logout(); navigate('/login'); }}>Sign out of all devices</button>
        </div>
      </div>
    </section>
  );
}

function Access() {
  const { me } = useAuth();
  const [activity, setActivity] = useState([]);
  const load = () => api('/auth/activity').then((d) => setActivity(d.entries)).catch(() => {});
  useEffect(() => { load(); }, []);

  const own = me.roleChain[0];
  const byRes = {};
  me.permissions.forEach((p) => { const [r, a] = p.split(':'); (byRes[r] ||= []).push({ a, from: me.grantedBy[p] }); });

  return (
    <section className="acc-sec" id="access">
      <div className="sec-title">
        <h2>Your access</h2>
        <Link to="/lab" className="btn small"><Icon name="flask" />Check a permission</Link>
      </div>
      <div className="access-card">
        <div className="chain">
          <span className="muted small">Role chain</span>
          {me.roleChain.map((r, i) => (
            <span key={r} className="chain">
              <span className={`badge ${i === 0 ? 'role' : ''}`}>{r}</span>
              {i < me.roleChain.length - 1 && <span className="arrow"><Icon name="arrow" />inherits</span>}
            </span>
          ))}
        </div>
        <p className="muted small">The server walks the role tree once, keeps each role's full permission set in a hash table, and answers every request with one lookup. Anything not listed below is denied by default.</p>
        {me.permissions.length === 0
          ? <div className="empty">This role has no permissions yet, so every protected page and action is refused.</div>
          : (
            <div className="perm-groups">
              {Object.entries(byRes).map(([res, list]) => (
                <div className="perm-box" key={res}>
                  <h3>{res}</h3>
                  <ul>{list.map(({ a, from }) => <li key={a}><span className="mono">{a}{a.endsWith('_own') && <em>your rows only</em>}</span><span className="from">{from === own ? 'your role' : `from ${from}`}</span></li>)}</ul>
                </div>
              ))}
            </div>
          )}
      </div>
      <div className="sec-title"><h3>Recent decisions on your account</h3><button className="btn small ghost" onClick={load}><Icon name="refresh" />Refresh</button></div>
      <div className="card flush">
        {activity.length === 0 ? <div className="empty">No decisions yet.</div> : (
          <table className="table compact">
            <thead><tr><th>Time</th><th>Request</th><th>Decision</th><th>Reason</th></tr></thead>
            <tbody>{activity.map((e) => (
              <tr key={e.id}><td className="nowrap muted">{fmtTime(e.createdAt)}</td><td><code>{e.resource}:{e.action}</code></td><td><Decision value={e.decision} /></td><td className="muted mono small">{e.reason}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </section>
  );
}

/** Your Account: profile and security (FR-03/04), plus FR-08 made visible for every signed-in user. */
export default function AccountPage() {
  const { me, can } = useAuth();
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, [hash]);

  return (
    <div className="store-page account">
      <h1>Your account</h1>
      <div className="acc-tiles">
        {TILES.map((t) => (
          <a key={t.id} href={`#${t.id}`} className="acc-tile"><Icon name={t.icon} /><div><b>{t.title}</b><span>{t.sub}</span></div></a>
        ))}
        {me.user.role !== 'CUSTOMER' && (
          <Link to={homeFor(me.user.role)} className="acc-tile dark"><Icon name="briefcase" /><div><b>Your workspace</b><span>Signed in as {me.user.role.replace('_', ' ').toLowerCase()}</span></div></Link>
        )}
      </div>

      <section className="acc-sec" id="orders">
        <h2>Your orders</h2>
        <div className="orders-empty">
          <Icon name="box" />
          {can('order:read_own')
            ? <div><b>You haven't placed any orders yet.</b><span>When you do, you'll be able to track, cancel and return them here.</span></div>
            : <div><b>This account doesn't place orders.</b><span>Your role ({me.user.role}) has no order:read_own permission.</span></div>}
          <Link to="/" className="btn small">Continue shopping</Link>
        </div>
      </section>

      <Security />
      <Access />
    </div>
  );
}
