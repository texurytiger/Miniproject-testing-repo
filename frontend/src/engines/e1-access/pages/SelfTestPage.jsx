import { useState } from 'react';
import { rawCall } from '../../../app/api';
import Icon from '../../../app/Icons';
import { PageHead } from './shared';

const PW = 'Password@123';
const staff = (email, role, password = PW) => ({ email, password, portal: 'staff', role });

/**
 * End-to-end self-test against the running server. Each scenario signs in as a seeded demo user
 * (tokens kept in memory only, your own session is untouched) and checks the exact status / decision.
 * Needs a freshly seeded database (npm run db:reset).
 */
const SCENARIOS = [
  { fr: 'FR-09', title: 'No token on a protected route', expect: '401', run: async () => { const r = await rawCall('GET', '/auth/me'); return [r.status === 401, `${r.status}`]; } },
  { fr: 'FR-09', title: 'Forged token is rejected', expect: '401', run: async () => { const r = await rawCall('GET', '/auth/me', { token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjF9.forged' }); return [r.status === 401, `${r.status}`]; } },
  { fr: 'FR-02', title: 'Wrong password', expect: '401, generic message', run: async () => { const r = await rawCall('POST', '/auth/login', { body: staff('customer@team3.test', 'CUSTOMER', 'wrong-pass') }); return [r.status === 401, `${r.status} "${r.data.message}"`]; } },
  { fr: 'FR-06', title: 'Deactivated account cannot sign in', expect: '401', run: async () => { const r = await rawCall('POST', '/auth/login', { body: staff('inactive@team3.test', 'CUSTOMER') }); return [r.status === 401, `${r.status} "${r.data.message}"`]; } },
  { fr: 'FR-02', title: 'Finance on the admin portal', expect: '401', run: async () => { const r = await rawCall('POST', '/auth/login', { body: { email: 'finance@team3.test', password: PW, portal: 'admin' } }); return [r.status === 401, `${r.status} "${r.data.message}"`]; } },
  { fr: 'FR-02', title: 'Finance picks SELLER on the staff portal', expect: '401 role mismatch', run: async () => { const r = await rawCall('POST', '/auth/login', { body: staff('finance@team3.test', 'SELLER') }); return [r.status === 401, `${r.status} "${r.data.message}"`]; } },
  { fr: 'FR-02', title: 'Admin on the staff portal', expect: '401', run: async () => { const r = await rawCall('POST', '/auth/login', { body: staff('admin@team3.test', 'CUSTOMER') }); return [r.status === 401, `${r.status} "${r.data.message}"`]; } },
  { fr: 'FR-02', title: 'Staff portal without a role', expect: '400', run: async () => { const r = await rawCall('POST', '/auth/login', { body: { email: 'finance@team3.test', password: PW, portal: 'staff' } }); return [r.status === 400, `${r.status}`]; } },
  { fr: 'FR-01', title: 'Register while asking for ADMIN', expect: '201 as CUSTOMER', note: 'creates one throwaway user', run: async () => { const r = await rawCall('POST', '/auth/register', { body: { name: 'Self Test', email: `selftest${Date.now()}@team3.test`, password: 'secret123', role: 'ADMIN' } }); const role = r.data.user && r.data.user.role; return [r.status === 201 && role === 'CUSTOMER', `${r.status}, role ${role}`]; } },
  { fr: 'FR-09', title: 'Customer opens the audit log', expect: '403', run: async (t) => { const r = await rawCall('GET', '/admin/audit', { token: await t('customer') }); return [r.status === 403, `${r.status}`]; } },
  { fr: 'FR-07', title: 'Finance inherits from EMPLOYEE', expect: 'chain FINANCE → EMPLOYEE', run: async (t) => { const r = await rawCall('GET', '/auth/me', { token: await t('finance') }); const c = (r.data.roleChain || []).join(' → '); return [c === 'FINANCE → EMPLOYEE', c || `${r.status}`]; } },
  { fr: 'FR-08', title: 'Finance may approve refunds', expect: 'ALLOW', run: async (t) => check(await t('finance'), 'refund', 'approve', null, 'ALLOW') },
  { fr: 'FR-10', title: 'Seller edits own product (owner #3)', expect: 'ALLOW GRANTED_OWN', run: async (t) => check(await t('seller1'), 'product', 'update', 3, 'ALLOW', 'GRANTED_OWN') },
  { fr: 'FR-10', title: "Seller edits another seller's product (owner #4)", expect: 'DENY NOT_OWNER', run: async (t) => check(await t('seller1'), 'product', 'update', 4, 'DENY', 'NOT_OWNER') },
  { fr: 'FR-09', title: 'CEO (no permissions) reads products', expect: 'DENY NO_PERMISSION', run: async (t) => check(await t('ceo'), 'product', 'read', null, 'DENY', 'NO_PERMISSION') },
  { fr: 'FR-07', title: 'Make EMPLOYEE a child of FINANCE (cycle)', expect: '409', run: async (t) => { const r = await rawCall('PUT', '/admin/roles/3/parent', { token: await t('admin'), body: { parentRoleId: 4 } }); return [r.status === 409, `${r.status} "${r.data.message}"`]; } },
  { fr: 'FR-07', title: 'Admin changes own role (lock-out guard)', expect: '403', run: async (t) => { const r = await rawCall('PUT', '/admin/users/1/role', { token: await t('admin'), body: { roleId: 1 } }); return [r.status === 403, `${r.status}`]; } },
  { fr: 'FR-11', title: 'Denials above were audited', expect: 'DENY rows present', run: async (t) => { const r = await rawCall('GET', '/admin/audit?decision=DENY&pageSize=50', { token: await t('admin') }); const reasons = new Set((r.data.entries || []).map((e) => e.reason)); const ok = ['NOT_OWNER', 'NO_PERMISSION', 'ROLE_MISMATCH', 'WRONG_PORTAL'].every((x) => reasons.has(x)); return [ok, [...reasons].join(', ')]; } },
];

async function check(token, resource, action, ownerId, decision, reason) {
  const r = await rawCall('POST', '/auth/check', { token, body: { resource, action, ...(ownerId ? { ownerId } : {}) } });
  const ok = r.data.decision === decision && (!reason || r.data.reason === reason);
  return [ok, r.status === 200 ? `${r.data.decision} ${r.data.reason}` : `${r.status}`];
}

const ACCOUNTS = { admin: ['admin@team3.test', null], customer: ['customer@team3.test', 'CUSTOMER'], finance: ['finance@team3.test', 'FINANCE'], seller1: ['seller1@team3.test', 'SELLER'], ceo: ['ceo@team3.test', 'CEO'] };

export default function SelfTestPage() {
  const [state, setState] = useState({});
  const [running, setRunning] = useState(false);

  async function runAll() {
    setRunning(true); setState({});
    const tokens = {};
    const token = async (who) => {
      if (!tokens[who]) {
        const [email, role] = ACCOUNTS[who];
        const body = role ? staff(email, role) : { email, password: PW, portal: 'admin' };
        const r = await rawCall('POST', '/auth/login', { body });
        tokens[who] = r.data.token || 'none';
      }
      return tokens[who];
    };
    for (let i = 0; i < SCENARIOS.length; i += 1) {
      setState((s) => ({ ...s, [i]: { run: true } }));
      const t0 = performance.now();
      let ok = false; let got = '';
      try { [ok, got] = await SCENARIOS[i].run(token); } catch (e) { got = e.message; }
      setState((s) => ({ ...s, [i]: { ok, got, ms: Math.round(performance.now() - t0) } }));
    }
    setRunning(false);
  }

  const done = Object.values(state).filter((s) => !s.run);
  const passed = done.filter((s) => s.ok).length;
  const pct = Math.round((done.length / SCENARIOS.length) * 100);

  return (
    <div className="stack">
      <PageHead title="Self-test" fr="FR-01 · 02 · 06 · 07 · 08 · 09 · 10 · 11"
        lead="Runs every E1 rule against the live server as the seeded demo users. Your own session is not touched. Run npm run db:reset first so the data is in its seeded state.">
        <button className="btn primary" onClick={runAll} disabled={running}><Icon name="play" />{running ? 'Running…' : done.length ? 'Run again' : 'Run all scenarios'}</button>
      </PageHead>

      <div className="grid three">
        <div className="card kpi"><div className="ic"><Icon name="flask" /></div><span className="n">{SCENARIOS.length}</span><span className="l">scenarios</span></div>
        <div className="card kpi allow"><div className="ic"><Icon name="check" /></div><span className="n">{passed}</span><span className="l">passed</span></div>
        <div className="card kpi deny"><div className="ic"><Icon name="x" /></div><span className="n">{done.length - passed}</span><span className="l">failed</span></div>
      </div>
      <div className="progress" aria-label="progress"><div style={{ width: `${pct}%` }} /></div>

      <section className="card flush">
        <table className="table">
          <thead><tr><th /><th>Scenario</th><th>FR</th><th>Expected</th><th>Server said</th><th className="right">Time</th></tr></thead>
          <tbody>
            {SCENARIOS.map((s, i) => {
              const st = state[i];
              const cls = !st ? 'wait' : st.run ? 'run' : st.ok ? 'pass' : 'fail';
              return (
                <tr key={s.title} className="test-row">
                  <td><span className={`status-ic ${cls}`}><Icon name={cls === 'pass' ? 'check' : cls === 'fail' ? 'x' : 'clock'} /></span></td>
                  <td><b>{s.title}</b>{s.note && <div className="muted small">{s.note}</div>}</td>
                  <td><span className="fr" style={{ marginLeft: 0 }}>{s.fr}</span></td>
                  <td className="mono small">{s.expect}</td>
                  <td className="small">{st && !st.run ? st.got : <span className="muted">—</span>}</td>
                  <td className="right muted small">{st && !st.run ? `${st.ms} ms` : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
