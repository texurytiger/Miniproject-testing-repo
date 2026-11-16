import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, homeFor } from '../../app/AuthContext';
import { api, isLocal } from '../../app/api';
import Icon from '../../app/Icons';
import { BRAND } from '../../config';
import ProductArt from '../ProductArt';
import { Shelf } from '../components';
import { off } from '../cart';

const SLIDES = [
  { eyebrow: 'Electronics', title: 'Sound, beautifully quiet.', sub: 'Noise-cancelling headphones, speakers and smartwatches from independent sellers.', cta: 'Shop electronics', to: '/s?category=electronics', art: ['headphones', 'speaker', 'watch'], cat: 'electronics' },
  { eyebrow: 'Home & kitchen', title: 'Make home feel like yours.', sub: 'Stoneware, planters and slow-morning essentials, delivered across India.', cta: 'Shop home', to: '/s?category=home', art: ['mug', 'plant', 'kettle'], cat: 'home' },
  { eyebrow: 'Books', title: 'Read something new tonight.', sub: 'Fiction and practical guides, picked by readers who left thousands of reviews.', cta: 'Browse books', to: '/s?category=books', art: ['book', 'book2', 'candle'], cat: 'books' },
];

function Hero() {
  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);
  useEffect(() => {
    if (hold || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % SLIDES.length), 6500);
    return () => clearInterval(t);
  }, [hold]);
  return (
    <section className="hero" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)} aria-roledescription="carousel">
      {SLIDES.map((s, k) => (
        <div key={s.title} className={`hero-slide ${k === i ? 'on' : ''}`} aria-hidden={k !== i}>
          <div className="hero-copy">
            <span className="eyebrow">{s.eyebrow}</span>
            <h1>{s.title}</h1>
            <p>{s.sub}</p>
            <Link className="btn primary lg" to={s.to} tabIndex={k === i ? 0 : -1}>{s.cta}<Icon name="arrow" /></Link>
          </div>
          <div className="hero-art">
            {s.art.map((a, n) => <div key={a} className={`hero-tile t${n}`}><ProductArt image={a} category={s.cat} /></div>)}
          </div>
        </div>
      ))}
      <div className="hero-ctl">
        <div className="hero-dots">{SLIDES.map((s, k) => <button key={s.title} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Slide ${k + 1}`} />)}</div>
        <button onClick={() => setI((i + SLIDES.length - 1) % SLIDES.length)} aria-label="Previous slide"><Icon name="chevron" style={{ transform: 'rotate(180deg)' }} /></button>
        <button onClick={() => setI((i + 1) % SLIDES.length)} aria-label="Next slide"><Icon name="chevron" /></button>
      </div>
    </section>
  );
}

function Categories({ cats, by }) {
  return (
    <section className="cats">
      <div className="sec-head"><h2>Shop by category</h2><Link to="/s">View all <Icon name="arrow" /></Link></div>
      <div className="cat-grid">
        {cats.map((c) => {
          const lead = (by[c.slug] || [])[0];
          return (
            <Link key={c.slug} to={`/s?category=${c.slug}`} className="cat-tile">
              <div className="cat-art">{lead && <ProductArt image={lead.image} category={c.slug} label={c.name} />}</div>
              <b>{c.name}</b>
              <span>{c.products} product{c.products === 1 ? '' : 's'}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function AccountBand() {
  const { me } = useAuth();
  if (!me) {
    return (
      <section className="band">
        <div><h3>Sign in for order tracking and a faster checkout.</h3><p>Your bag, orders and returns, all in one place.</p></div>
        <div className="band-acts"><Link to="/login" className="btn light lg">Sign in</Link><Link to="/register" className="btn ghost-light lg">Create account</Link></div>
      </section>
    );
  }
  const first = me.user.name.split(' ')[0];
  return (
    <section className="band">
      <div><h3>Welcome back, {first}.</h3><p>Pick up where you left off.</p></div>
      <div className="band-acts">
        <Link to="/account#orders" className="btn ghost-light lg"><Icon name="box" />Orders</Link>
        <Link to="/cart" className="btn ghost-light lg"><Icon name="cart" />Bag</Link>
        {me.user.role !== 'CUSTOMER' && <Link to={homeFor(me.user.role)} className="btn light lg"><Icon name="briefcase" />Your workspace</Link>}
      </div>
    </section>
  );
}

/** Shown when the catalog can't be loaded: says plainly the problem is ours, and offers a retry. */
function LoadError({ error, retry }) {
  return (
    <div className="load-error">
      <Icon name="info" />
      <h2>We couldn't load the store right now</h2>
      <p>This is a problem on our side, not yours. Please try again in a moment.</p>
      <button className="btn primary" onClick={retry}><Icon name="refresh" />Try again</button>
      {isLocal && error.devInfo && <p className="dev-hint">For developers: {error.devInfo}</p>}
    </div>
  );
}

export default function HomePage() {
  const [products, setProducts] = useState(null);
  const [cats, setCats] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null); setProducts(null);
    Promise.all([api('/catalog/products?limit=60', { auth: false }), api('/catalog/categories', { auth: false })])
      .then(([p, c]) => { setProducts(p.products); setCats(c.categories); })
      .catch((e) => setError(e));
  }, []);
  useEffect(() => { load(); }, [load]);

  const by = useMemo(() => {
    const m = {};
    (products || []).forEach((p) => { (m[p.category] ||= []).push(p); });
    return m;
  }, [products]);
  const list = products || [];
  const best = [...list].sort((a, b) => b.reviews - a.reviews).slice(0, 12);
  const deals = [...list].sort((a, b) => off(b) - off(a)).slice(0, 12);
  const rated = [...list].sort((a, b) => b.rating - a.rating).slice(0, 12);

  return (
    <div className="home">
      <Hero />
      <div className="home-body">
        {error ? <LoadError error={error} retry={load} /> : products === null ? (
          <div className="cat-grid">{[0, 1, 2, 3, 4, 5].map((k) => <div key={k} className="cat-tile skeleton" />)}</div>
        ) : (
          <>
            <Categories cats={cats} by={by} />
            <Shelf title="Best sellers" link="/s" products={best} />
            <AccountBand />
            <Shelf title="Biggest savings today" link="/s?sort=deal" products={deals} />
            <Shelf title="Loved by customers" link="/s?sort=rating" products={rated} />
            <section className="seller-band">
              <div>
                <span className="eyebrow">Sell with {BRAND.short}</span>
                <h3>Your shop, in front of every customer.</h3>
                <p>List products, set prices and manage stock from Seller Central. Only you can change your listings: the server checks ownership on every edit.</p>
              </div>
              <Link to="/seller/login" className="btn primary lg">Open Seller Central<Icon name="arrow" /></Link>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
