import { useEffect, useState } from 'react';
import { api } from '../../../app/api';
import Icon from '../../../app/Icons';
import { Alert, PageHead } from './shared';

/** FR-12 Permission audit report: every role against every permission, direct vs inherited. */
export default function MatrixPage() {
  const [roles, setRoles] = useState([]);
  const [perms, setPerms] = useState([]);
  const [msg, setMsg] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => {
    Promise.all([api('/admin/roles'), api('/admin/permissions')])
      .then(([r, p]) => { setRoles(r.roles); setPerms(p.permissions); })
      .catch((e) => setMsg({ type: 'error', text: e.message }));
    api('/admin/report').then(setReport).catch(() => {});
  }, []);

  const byRes = perms.reduce((m, p) => { (m[p.resource] ||= []).push(p); return m; }, {});
  const cell = (role, key) => {
    if (role.directPermissions.includes(key)) return <span className="cell d" title={`${role.name}: granted directly`}><Icon name="check" strokeWidth="3" /></span>;
    if (role.effectivePermissions.includes(key)) return <span className="cell i" title={`${role.name}: inherited from a parent role`}><Icon name="check" strokeWidth="3" /></span>;
    return <span className="cell n" title={`${role.name}: denied by default`}>–</span>;
  };

  function downloadCsv() {
    const head = ['permission', ...roles.map((r) => r.name)];
    const lines = perms.map((p) => {
      const k = `${p.resource}:${p.action}`;
      return [k, ...roles.map((r) => (r.directPermissions.includes(k) ? 'direct' : r.effectivePermissions.includes(k) ? 'inherited' : ''))];
    });
    const csv = [head, ...lines].map((l) => l.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'permission-report.csv';
    a.click();
  }

  return (
    <div className="stack">
      <PageHead title="Permission matrix" fr="FR-12" lead="Who can do what, straight from the live role tree. Use it to spot roles with too much access.">
        <button className="btn" onClick={downloadCsv} disabled={!roles.length}><Icon name="scroll" />Download CSV</button>
      </PageHead>
      <Alert msg={msg} />
      {report && (
        <section className="card">
          <h2>Report findings</h2>
          <p className="muted small" style={{ marginTop: 4 }}>Permission cache rebuilt {new Date(report.cacheBuiltAt).toLocaleTimeString('en-IN')} in {report.cacheBuildMs.toFixed(2)} ms.</p>
          {report.warnings.length === 0
            ? <div className="alert ok" style={{ marginTop: 12 }}><Icon name="check" />No problems found.</div>
            : <ul className="findings">{report.warnings.map((w) => <li key={w}><Icon name="alert" />{w}</li>)}</ul>}
        </section>
      )}
      <div className="legend">
        <span><span className="cell d"><Icon name="check" strokeWidth="3" /></span>granted directly</span>
        <span><span className="cell i"><Icon name="check" strokeWidth="3" /></span>inherited from a parent role</span>
        <span><span className="cell n">–</span>denied by default</span>
      </div>
      <section className="card flush matrix-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th className="perm">permission</th>
              {roles.map((r) => <th key={r.id}>{r.name}<div className="muted" style={{ fontWeight: 500 }}>{r.effectivePermissions.length}</div></th>)}
            </tr>
          </thead>
          <tbody>
            {Object.entries(byRes).map(([res, list]) => [
              <tr className="res-row" key={res}><th colSpan={roles.length + 1}>{res}</th></tr>,
              ...list.map((p) => {
                const k = `${p.resource}:${p.action}`;
                return <tr key={k}><th className="perm">{k}</th>{roles.map((r) => <td key={r.id}>{cell(r, k)}</td>)}</tr>;
              }),
            ])}
          </tbody>
        </table>
      </section>
    </div>
  );
}
