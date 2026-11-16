import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext';
import { api } from '../../app/api';
import Icon from '../../app/Icons';
import ProductArt from '../ProductArt';
import { TABS } from './PortalLayout';
import { STATUS } from './SellerHome';

function StockRow({ p, canEdit, onSaved }) {
  const [stock, setStock] = useState(String(p.stock));
  const [msg, setMsg] = useState(null);
  async function save() {
    try {
      const { product } = await api(`/ops/stock/${p.id}`, { method: 'PATCH', body: { stock: Number(stock) } });
      onSaved(product); setMsg({ ok: true });
    } catch (e) { setMsg({ err: e.details ? `stock ${e.details.stock}` : e.message }); }
  }
  const [cls, label] = STATUS[p.status];
  return (
    <tr className={p.stock <= 15 ? 'low' : ''}>
      <td><div className="inv-prod"><ProductArt image={p.image} category={p.category} /><div><b>{p.name}</b><span>SKU T3-{String(p.id).padStart(4, '0')} · {p.sellerName}</span></div></div></td>
      <td><span className={`badge dot ${cls}`}>{label}</span></td>
      <td>{canEdit ? <input className="inv-qty" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} aria-label={`Stock of ${p.name}`} /> : <b>{p.stock}</b>}</td>
      <td className="right">
        {canEdit && <button className="btn small primary" disabled={Number(stock) === p.stock} onClick={save}>Update</button>}
        {msg && msg.ok && Number(stock) === p.stock && <span className="inv-msg ok"><Icon name="check" />Updated</span>}
        {msg && msg.err && <span className="inv-msg err">{msg.err}</span>}
      </td>
    </tr>
  );
}

function Stock() {
  const { can } = useAuth();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  useEffect(() => { api('/ops/stock').then((d) => setRows(d.products)).catch((e) => { setError(e.message); setRows([]); }); }, []);
  const shown = useMemo(() => (rows || []).filter((p) => !lowOnly || p.stock <= 15), [rows, lowOnly]);
  const canEdit = can('stock:update');
  return (
    <div className="pt-stack">
      <div className="pt-head">
        <div><h1>Stock levels</h1><p className="muted">{canEdit ? 'Correct counts after a physical check. Zero hides a product from the store.' : 'Read-only: your role can see stock but not change it.'}</p></div>
        <span className="spacer" />
        <label className="toggle"><input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />Low stock only (≤ 15)</label>
      </div>
      {error && <div className="alert error"><Icon name="alert" />{error}</div>}
      <section className="pt-card flush">
        <table className="table inv">
          <thead><tr><th>Product</th><th>Status</th><th>On hand</th><th /></tr></thead>
          <tbody>{shown.map((p) => <StockRow key={p.id} p={p} canEdit={canEdit} onSaved={(np) => setRows((l) => l.map((x) => (x.id === np.id ? np : x)))} />)}</tbody>
        </table>
      </section>
    </div>
  );
}

const SOON = {
  orders: ['box', 'Order queue is empty', 'Paid orders will arrive here for packing and shipping once checkout goes live in Sprint 2.'],
  refunds: ['return', 'No refund requests', 'Customers request refunds on their own orders; approvals land here once orders exist (Sprint 2).'],
  payments: ['wallet', 'No payments recorded', 'Transactions from the payment service will be listed here in Sprint 2.'],
  reports: ['grid', 'No reports yet', 'Daily sales and refund reports are generated from real orders, starting Sprint 2.'],
};

export default function OpsHome() {
  const { me } = useAuth();
  const { can } = useAuth();
  const [params] = useSearchParams();
  const tabs = TABS.ops.filter((t) => can(t.permission));

  if (!tabs.length) {
    return (
      <div className="pt-empty wide">
        <Icon name="lock" />
        <h3>Your role has no permissions yet</h3>
        <p className="muted">You're signed in as <b>{me.user.role}</b>. No role in your chain grants anything, so every area is closed (deny by default). An administrator can grant permissions to this role in the admin console.</p>
        <Link to="/account#access" className="btn small">See your access</Link>
      </div>
    );
  }
  const tab = tabs.find((t) => t.id === params.get('tab')) ? params.get('tab') : tabs[0].id;
  if (tab === 'stock') return <Stock />;
  const [icon, title, text] = SOON[tab];
  return <div className="pt-empty"><Icon name={icon} /><h3>{title}</h3><p className="muted">{text}</p></div>;
}
