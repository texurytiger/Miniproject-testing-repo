import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../app/AuthContext';
import { api } from '../../../app/api';
import Icon from '../../../app/Icons';
import { Alert, Decision, PageHead, REASONS } from './shared';

/**
 * Access Lab: ask the live server "may I do resource:action (on a row owned by user N)?"
 * Calls POST /api/auth/check, which runs the same authorize() every guarded route uses, and is audited.
 * Covers FR-08 (check), FR-09 (deny by default), FR-10 (row-level ownership).
 */
export default function AccessLabPage() {
  const { me } = useAuth();
  const [catalog, setCatalog] = useState([]);
  const [q, setQ] = useState({ resource: 'product', action: 'read', ownerId: '' });
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [sweep, setSweep] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api('/auth/permission-catalog').then((d) => setCatalog(d.permissions)).catch((e) => setMsg({ type: 'error', text: e.message })); }, []);

  const resources = useMemo(() => [...new Set(catalog.map((p) => p.resource))], [catalog]);
  // Offer every catalog action, plus the plain action behind each "_own" one (update_own -> update),
  // because that is what a real route asks for; E1 then falls back to the _own grant with the row's owner.
  const actions = useMemo(() => {
    const list = catalog.filter((p) => p.resource === q.resource).map((p) => p.action);
    list.filter((a) => a.endsWith('_own')).forEach((a) => { const base = a.slice(0, -4); if (!list.includes(base)) list.push(base); });
    return list.sort();
  }, [catalog, q.resource]);
  const needsOwner = catalog.some((p) => p.resource === q.resource && p.action === `${q.action}_own`);

  async function check(input = q) {
    setMsg(null); setBusy(true);
    const body = { resource: input.resource, action: input.action, ...(input.ownerId ? { ownerId: Number(input.ownerId) } : {}) };
    try {
      const r = await api('/auth/check', { method: 'POST', body });
      setResult(r);
      setHistory((h) => [r, ...h].slice(0, 12));
    } catch (err) {
      setMsg({ type: 'error', text: err.details ? Object.entries(err.details).map(([k, v]) => `${k} ${v}`).join(', ') : `${err.status}: ${err.message}` });
    } finally { setBusy(false); }
  }

  async function runSweep() {
    setBusy(true); setMsg(null);
    const rows = [];
    for (const p of catalog) {
      try { rows.push(await api('/auth/check', { method: 'POST', body: { resource: p.resource, action: p.action } })); } catch { /* skip */ }
    }
    setSweep(rows); setBusy(false);
  }

  const mine = me.permissions[0];
  const missing = catalog.find((p) => !me.permissions.includes(`${p.resource}:${p.action}`));
  const presets = [
    mine && { label: 'Something I have', sub: mine, q: { resource: mine.split(':')[0], action: mine.split(':')[1], ownerId: '' } },
    missing && { label: 'Something I do not have', sub: `${missing.resource}:${missing.action}`, q: { resource: missing.resource, action: missing.action, ownerId: '' } },
    { label: 'Edit a product I own', sub: `product:update · owner = me (#${me.user.id})`, q: { resource: 'product', action: 'update', ownerId: String(me.user.id) } },
    { label: "Edit someone else's product", sub: `product:update · owner = #${me.user.id === 4 ? 3 : 4}`, q: { resource: 'product', action: 'update', ownerId: String(me.user.id === 4 ? 3 : 4) } },
    { label: 'Made-up permission', sub: 'spaceship:launch (not in the catalog)', q: { resource: 'spaceship', action: 'launch', ownerId: '' } },
  ].filter(Boolean);

  const allowN = sweep ? sweep.filter((r) => r.decision === 'ALLOW').length : 0;

  return (
    <div className="stack">
      <PageHead title="Access Lab" fr="FR-08 · FR-09 · FR-10"
        lead={`Ask the live server whether ${me.user.role} may perform an action. Each check runs the real authorize() and is written to the audit log.`} />
      <Alert msg={msg} />

      <div className="grid lab">
        <div className="stack">
          <section className="card">
            <h2>Build a request</h2>
            <form className="stack" style={{ gap: 14, marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); check(); }}>
              <label className="field">Resource
                <select value={q.resource} onChange={(e) => setQ({ resource: e.target.value, action: '', ownerId: '' })}>
                  {resources.map((r) => <option key={r}>{r}</option>)}
                  {!resources.includes(q.resource) && <option>{q.resource}</option>}
                </select>
              </label>
              <label className="field">Action
                <select value={q.action} onChange={(e) => setQ({ ...q, action: e.target.value })}>
                  <option value="">choose…</option>
                  {actions.map((a) => <option key={a}>{a}</option>)}
                  {q.action && !actions.includes(q.action) && <option>{q.action}</option>}
                </select>
              </label>
              <label className="field">Row owner (user id) <span className="hint">{needsOwner ? 'This action has an _own version: the owner decides the result.' : 'Optional. Used only for _own permissions.'}</span>
                <input type="number" min="1" value={q.ownerId} onChange={(e) => setQ({ ...q, ownerId: e.target.value })} placeholder={`e.g. ${me.user.id} (you)`} />
              </label>
              <button className="btn primary block" disabled={busy || !q.action}><Icon name="play" />Check permission</button>
            </form>
          </section>
          <section className="card">
            <h2>Quick scenarios</h2>
            <div className="presets" style={{ marginTop: 12 }}>
              {presets.map((p) => (
                <button key={p.label} className="preset" onClick={() => { setQ(p.q); check(p.q); }} disabled={busy}>
                  <div><b>{p.label}</b><br /><span className="mono">{p.sub}</span></div><Icon name="arrow" width="16" />
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="stack">
          {!result ? (
            <div className="verdict idle"><b>No check yet.</b><span>Pick a scenario or build a request. The answer comes from the server.</span></div>
          ) : (
            <div className={`verdict ${result.decision === 'ALLOW' ? 'allow' : 'deny'}`}>
              <div className="big"><Icon name={result.decision === 'ALLOW' ? 'check' : 'x'} />{result.decision}</div>
              <p>{REASONS[result.reason] || result.reason}</p>
              <dl>
                <dt>Request</dt><dd className="mono">{result.resource}:{result.action}{result.ownerId ? ` (owner #${result.ownerId})` : ''}</dd>
                <dt>Reason code</dt><dd className="mono">{result.reason}</dd>
                <dt>Checked as</dt><dd>{me.user.email} · {me.user.role}</dd>
                <dt>Decision time</dt><dd>{result.tookMs} ms (includes the audit write)</dd>
              </dl>
            </div>
          )}

          <section className="card flush">
            <div className="card-head"><div><h2>This session's checks</h2><p>Newest first.</p></div></div>
            {history.length === 0 ? <div className="empty">Nothing yet.</div> : (
              <table className="table compact">
                <thead><tr><th>Request</th><th>Owner</th><th>Decision</th><th>Reason</th></tr></thead>
                <tbody>{history.map((h, i) => (
                  <tr key={i}><td><code>{h.resource}:{h.action}</code></td><td className="muted">{h.ownerId ? `#${h.ownerId}` : '—'}</td><td><Decision value={h.decision} /></td><td className="muted mono small">{h.reason}</td></tr>
                ))}</tbody>
              </table>
            )}
          </section>

          <section className="card">
            <div className="row">
              <div><h2>Sweep the whole catalog</h2><p className="muted small">Checks all {catalog.length} permissions for your role in one go ({catalog.length} audit rows).</p></div>
              <span className="spacer" />
              <button className="btn" onClick={runSweep} disabled={busy || !catalog.length}><Icon name="grid" />Run sweep</button>
            </div>
            {sweep && (
              <>
                <p style={{ margin: '14px 0 10px' }}><b className="mono">{allowN}</b> allowed · <b className="mono">{sweep.length - allowN}</b> denied</p>
                <div className="chips">
                  {sweep.map((r) => <span key={`${r.resource}:${r.action}`} className={`badge ${r.decision === 'ALLOW' ? 'allow' : 'deny'}`}>{r.resource}:{r.action}</span>)}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
