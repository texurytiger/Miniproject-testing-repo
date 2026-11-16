import { useEffect, useState } from 'react';
import { api } from '../../../app/api';
import { Alert, Decision, PageHead, fmtTime } from './shared';

/** FR-11 / UC-E1-07 View Audit Log (insert-only: every ALLOW and DENY decision). */
export default function AuditPage() {
  const [filters, setFilters] = useState({ decision: '', resource: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ entries: [], total: 0, pageSize: 15 });
  const [error, setError] = useState('');

  useEffect(() => {
    const qs = new URLSearchParams({ page, pageSize: 15 });
    if (filters.decision) qs.set('decision', filters.decision);
    if (filters.resource) qs.set('resource', filters.resource);
    api(`/admin/audit?${qs}`).then(setData).catch((e) => setError(e.message));
  }, [filters, page]);

  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const set = (k) => (e) => { setPage(1); setFilters({ ...filters, [k]: e.target.value }); };

  return (
    <div className="stack">
      <PageHead title="Audit log" fr="FR-11" lead="Every authorization decision, newest first. Rows are only ever inserted, never updated or deleted." />
      <Alert msg={error && { type: 'error', text: error }} />
      <div className="toolbar">
        <select className="compact" value={filters.decision} onChange={set('decision')} aria-label="Decision">
          <option value="">All decisions</option><option value="ALLOW">ALLOW</option><option value="DENY">DENY</option>
        </select>
        <select className="compact" value={filters.resource} onChange={set('resource')} aria-label="Resource">
          <option value="">All resources</option>
          {['session', 'user', 'role', 'audit', 'product', 'order', 'payment'].map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <span className="muted">{data.total} {data.total === 1 ? 'entry' : 'entries'}</span>
      </div>
      <section className="card flush">
        <table className="table">
          <thead><tr><th>#</th><th>Time</th><th>User</th><th>Request</th><th>Decision</th><th>Reason</th></tr></thead>
          <tbody>
            {data.entries.map((e) => (
              <tr key={e.id}>
                <td className="muted">{e.id}</td>
                <td className="nowrap muted">{fmtTime(e.createdAt)}</td>
                <td>{e.email || <span className="muted">anonymous</span>}</td>
                <td><code>{e.resource}:{e.action}</code></td>
                <td><Decision value={e.decision} /></td>
                <td className="muted mono small">{e.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div className="pager">
        <button className="btn small" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Newer</button>
        <span className="muted">Page {page} of {pages}</span>
        <button className="btn small" disabled={page >= pages} onClick={() => setPage(page + 1)}>Older →</button>
      </div>
    </div>
  );
}
