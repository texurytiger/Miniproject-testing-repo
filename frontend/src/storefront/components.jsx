import { useRef } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../app/Icons';
import ProductArt from './ProductArt';
import { off, rupees } from './cart';

export function Stars({ value, count }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span className="stars" title={`${value} out of 5`}>
      <span className="stars-bar" aria-hidden><span style={{ width: `${pct}%` }} /></span>
      <span className="stars-n">{value.toFixed(1)}</span>
      {count != null && <span className="stars-c">({count.toLocaleString('en-IN')})</span>}
    </span>
  );
}

export function Price({ p, size }) {
  const pct = off(p);
  return (
    <div className={`price ${size || ''}`}>
      {pct > 0 && <span className="price-off">−{pct}%</span>}
      <span className="price-now"><sup>₹</sup>{Number(p.price).toLocaleString('en-IN')}</span>
      {pct > 0 && <span className="price-mrp">M.R.P. <s>{rupees(p.mrp)}</s></span>}
    </div>
  );
}

export function ProductCard({ p }) {
  return (
    <Link to={`/p/${p.id}`} className="pcard">
      <div className="pcard-img"><ProductArt image={p.image} category={p.category} label={p.name} /></div>
      <div className="pcard-body">
        <span className="pcard-name">{p.name}</span>
        <Stars value={p.rating} count={p.reviews} />
        <Price p={p} />
        {p.stock > 0 && p.stock <= 15 && <span className="pcard-low">Only {p.stock} left in stock</span>}
      </div>
    </Link>
  );
}

/** Horizontal product shelf with scroll buttons. */
export function Shelf({ title, link, products }) {
  const ref = useRef(null);
  const scroll = (d) => ref.current && ref.current.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  if (!products.length) return null;
  return (
    <section className="shelf">
      <div className="shelf-head">
        <h2>{title}</h2>
        {link && <Link to={link}>See all <Icon name="chevron" /></Link>}
      </div>
      <div className="shelf-wrap">
        <button className="shelf-btn l" onClick={() => scroll(-1)} aria-label="Scroll left"><Icon name="chevron" /></button>
        <div className="shelf-row" ref={ref}>
          {products.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
        <button className="shelf-btn r" onClick={() => scroll(1)} aria-label="Scroll right"><Icon name="chevron" /></button>
      </div>
    </section>
  );
}
