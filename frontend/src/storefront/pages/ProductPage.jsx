import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../app/api';
import Icon from '../../app/Icons';
import ProductArt from '../ProductArt';
import { Price, Shelf, Stars } from '../components';
import { cart } from '../cart';

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [p, setP] = useState(null);
  const [related, setRelated] = useState([]);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setP(null); setError(''); setAdded(false); setQty(1);
    api(`/catalog/products/${id}`, { auth: false })
      .then(({ product }) => {
        setP(product);
        return api(`/catalog/products?category=${product.category}&limit=12`, { auth: false });
      })
      .then((d) => d && setRelated(d.products.filter((x) => String(x.id) !== String(id))))
      .catch((e) => setError(e.status === 404 ? 'This product is not available.' : e.message));
  }, [id]);

  if (error) return <div className="store-page"><div className="denied"><h1>{error}</h1><Link className="btn" to="/">Back to the homepage</Link></div></div>;
  if (!p) return <div className="store-page"><div className="center muted">Loading…</div></div>;
  const sold = p.status === 'SOLD_OUT' || p.stock === 0;

  return (
    <div className="store-page">
      <nav className="crumbs"><Link to="/">Home</Link><Icon name="chevron" /><Link to={`/s?category=${p.category}`}>{p.categoryName}</Link><Icon name="chevron" /><span>{p.name}</span></nav>
      <div className="pdp">
        <div className="pdp-img"><ProductArt image={p.image} category={p.category} label={p.name} /></div>
        <div className="pdp-info">
          <h1>{p.name}</h1>
          <span className="small">Sold by <b>{p.sellerName}</b></span>
          <Stars value={p.rating} count={p.reviews} />
          <hr />
          <Price p={p} size="lg" />
          <span className="small muted">Inclusive of all taxes</span>
          <hr />
          <h4>About this item</h4>
          <p>{p.description}</p>
        </div>
        <aside className="buybox">
          <Price p={p} />
          <span className="small"><Icon name="truck" /> Free delivery on your first order</span>
          {sold ? <span className="stock out">Currently unavailable</span> : <span className={`stock ${p.stock <= 15 ? 'low' : ''}`}>{p.stock <= 15 ? `Only ${p.stock} left in stock` : 'In stock'}</span>}
          {!sold && (
            <>
              <label className="qty">Quantity
                <select value={qty} onChange={(e) => setQty(Number(e.target.value))}>{Array.from({ length: Math.min(10, p.stock) }, (_, k) => <option key={k + 1}>{k + 1}</option>)}</select>
              </label>
              <button className="btn primary block lg" onClick={() => { cart.add(p, qty); setAdded(true); }}>Add to cart</button>
              <button className="btn block lg" onClick={() => { cart.add(p, qty); navigate('/cart'); }}>Buy now</button>
              {added && <div className="alert ok"><Icon name="check" />Added to your cart. <Link to="/cart">View cart</Link></div>}
            </>
          )}
          <dl className="buy-meta"><dt>Ships from</dt><dd>Team3 Store</dd><dt>Sold by</dt><dd>{p.sellerName}</dd><dt>Returns</dt><dd>7-day return window</dd></dl>
        </aside>
      </div>
      <Shelf title={`More in ${p.categoryName}`} link={`/s?category=${p.category}`} products={related} />
    </div>
  );
}
