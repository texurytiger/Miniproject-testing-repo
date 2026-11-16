import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext';
import { api } from '../../app/api';
import Icon from '../../app/Icons';
import ProductArt from '../ProductArt';
import { rupees } from '../cart';
import { TABS } from './PortalLayout';

export const STATUS = {
  APPROVED: ['allow', 'Active'],
  SOLD_OUT: ['deny', 'Out of stock'],
  PENDING: ['warn', 'Awaiting approval'],
};

function Row({ p, onSaved }) {
  const [price, setPrice] = useState(String(p.price));
  const [stock, setStock] = useState(String(p.stock));
  const [state, setState] = useState(null);
  const dirty = Number(price) !== p.price || Number(stock) !== p.stock;

  async function save() {
    setState({ busy: true });
    try {
      const { product } = await api(`/catalog/products/${p.id}`, { method: 'PATCH', body: { price: Number(price), stock: Number(stock) } });
      onSaved(product);
      setState({ ok: 'Saved' });
    } catch (e) {
      setState({ err: e.details ? Object.entries(e.details).map(([k, v]) => `${k} ${v}`).join(', ') : e.message });
    }
  }
  const [cls, label] = STATUS[p.status];
  return (
    <tr>
      <td><div className="inv-prod"><ProductArt image={p.image} category={p.category} /><div><Link to={`/p/${p.id}`}>{p.name}</Link><span>{p.categoryName} · ID {p.id}</span></div></div></td>
      <td><span className={`badge dot ${cls}`}>{label}</span></td>
      <td><div className="inv-in"><span>₹</span><input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} aria-label={`Price of ${p.name}`} /></div><span className="muted small">M.R.P. {rupees(p.mrp)}</span></td>
      <td><input className="inv-qty" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} aria-label={`Stock of ${p.name}`} /></td>
      <td className="right">
        <button className="btn small primary" disabled={!dirty || (state && state.busy)} onClick={save}>Save</button>
        {state && state.ok && !dirty && <span className="inv-msg ok"><Icon name="check" />{state.ok}</span>}
        {state && state.err && <span className="inv-msg err">{state.err}</span>}
      </td>
    </tr>
  );
}

/** Calls PATCH on another seller's product: E1 must answer 403 NOT_OWNER. */
function OwnershipCheck({ myId }) {
  const [res, setRes] = useState(null);
  async function run() {
    setRes({ busy: true });
    const { products } = await api('/catalog/products?limit=60', { auth: false });
    const other = products.find((x) => x.sellerId !== myId);
    if (!other) return setRes({ text: 'No product from another seller to test with.' });
    try {
      await api(`/catalog/products/${other.id}`, { method: 'PATCH', body: { price: other.price } });
      setRes({ bad: true, text: `Unexpected: the server allowed editing "${other.name}".` });
    } catch (e) {
      setRes({ code: e.status, text: `${e.status} ${e.code}: ${e.message}`, name: other.name, seller: other.sellerName });
    }
  }
  return (
    <section className="pt-card">
      <div className="pt-card-head">
        <div><h3>Ownership check</h3><p className="muted small">Try to change the price of a product listed by another seller. The server should refuse.</p></div>
        <button className="btn small" onClick={run} disabled={res && res.busy}><Icon name="play" />Run check</button>
      </div>
      {res && !res.busy && (
        <div className={`alert ${res.code === 403 ? 'ok' : 'error'}`}>
          <Icon name={res.code === 403 ? 'check' : 'alert'} />
          <span>{res.name && <>Tried "{res.name}" (seller: {res.seller}). </>}Server answered <b>{res.text}</b></span>
        </div>
      )}
    </section>
  );
}

function Soon({ icon, title, text }) {
  return <div className="pt-empty"><Icon name={icon} /><h3>{title}</h3><p className="muted">{text}</p></div>;
}

export default function SellerHome() {
  const { me } = useAuth();
  const [params] = useSearchParams();
  const tab = params.get('tab') || TABS.seller[0].id;
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => { api('/seller/products').then((d) => setProducts(d.products)).catch((e) => { setError(e.message); setProducts([]); }); }, []);
  const shown = useMemo(() => (products || []).filter((p) => `${p.name} ${p.categoryName} ${p.status}`.toLowerCase().includes(filter.toLowerCase())), [products, filter]);
  const saved = (np) => setProducts((list) => list.map((x) => (x.id === np.id ? np : x)));

  if (tab === 'orders') return <Soon icon="box" title="No orders yet" text="Orders for your products appear here once checkout goes live in Sprint 2 (E2 order service)." />;
  if (tab === 'payments') return <Soon icon="wallet" title="No payments yet" text="Settlements for your orders will be listed here after the payment service ships in Sprint 2." />;

  return (
    <div className="pt-stack">
      <div className="pt-head">
        <div><h1>Manage inventory</h1><p className="muted">{me.user.name} · {products ? `${products.length} listing${products.length === 1 ? '' : 's'}` : 'loading…'}</p></div>
        <span className="spacer" />
        <div className="pt-search"><Icon name="search" /><input placeholder="Search your listings" value={filter} onChange={(e) => setFilter(e.target.value)} /></div>
      </div>
      {error && <div className="alert error"><Icon name="alert" />{error}</div>}
      <section className="pt-card flush">
        <table className="table inv">
          <thead><tr><th>Product</th><th>Status</th><th>Price</th><th>Available</th><th /></tr></thead>
          <tbody>
            {shown.map((p) => <Row key={p.id} p={p} onSaved={saved} />)}
            {products && !shown.length && <tr><td colSpan="5" className="empty">No listings match.</td></tr>}
          </tbody>
        </table>
      </section>
      <p className="muted small">Setting stock to 0 marks a listing <b>Out of stock</b> and hides it from search; restocking makes it active again. New listings wait for admin approval.</p>
      <OwnershipCheck myId={me.user.id} />
    </div>
  );
}
