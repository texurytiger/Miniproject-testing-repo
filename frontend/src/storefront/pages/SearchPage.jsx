import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../app/api';
import Icon from '../../app/Icons';
import { ProductCard } from '../components';
import { off } from '../cart';

const SORTS = { featured: 'Featured', low: 'Price: low to high', high: 'Price: high to low', rating: 'Avg. customer review', deal: 'Biggest discount' };

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const sort = params.get('sort') || 'featured';
  const [data, setData] = useState(null);
  const [cats, setCats] = useState([]);
  const [minRating, setMinRating] = useState(0);

  useEffect(() => { api('/catalog/categories', { auth: false }).then((d) => setCats(d.categories)).catch(() => {}); }, []);
  useEffect(() => {
    setData(null);
    const s = new URLSearchParams({ limit: 60 });
    if (q) s.set('q', q);
    if (category) s.set('category', category);
    api(`/catalog/products?${s}`, { auth: false }).then(setData).catch((e) => setData({ products: [], error: e.message }));
  }, [q, category]);

  const shown = useMemo(() => {
    const list = (data ? data.products : []).filter((p) => p.rating >= minRating);
    const cmp = { low: (a, b) => a.price - b.price, high: (a, b) => b.price - a.price, rating: (a, b) => b.rating - a.rating, deal: (a, b) => off(b) - off(a) }[sort];
    return cmp ? [...list].sort(cmp) : list;
  }, [data, sort, minRating]);

  const set = (k, v) => { const s = new URLSearchParams(params); if (v) s.set(k, v); else s.delete(k); setParams(s); };
  const catName = (cats.find((c) => c.slug === category) || {}).name;

  return (
    <div className="store-page search">
      <div className="search-bar">
        <span>
          {data ? <>{shown.length} result{shown.length === 1 ? '' : 's'}</> : 'Searching…'}
          {(data && data.correctedQuery) ? <> for <b>"{data.correctedQuery}"</b></> : q ? <> for <b>"{q}"</b></> : null}
          {catName && <> in <b>{catName}</b></>}
        </span>
        <label className="sort">Sort by
          <select value={sort} onChange={(e) => set('sort', e.target.value === 'featured' ? '' : e.target.value)}>
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
      </div>
      {data && data.correctedQuery && (
        <div className="did-you-mean">
          Showing results for <b>{data.correctedQuery}</b>. No matches for <s>{q}</s>; our search corrected the spelling.
        </div>
      )}
      <div className="search-grid">
        <aside className="filters">
          <h4>Department</h4>
          <button className={!category ? 'on' : ''} onClick={() => set('category', '')}>All departments</button>
          {cats.map((c) => <button key={c.slug} className={category === c.slug ? 'on' : ''} onClick={() => set('category', c.slug)}>{c.name}</button>)}
          <h4>Customer review</h4>
          {[4, 3, 0].map((r) => <button key={r} className={minRating === r ? 'on' : ''} onClick={() => setMinRating(r)}>{r ? `${r}★ & up` : 'Any rating'}</button>)}
        </aside>
        <section>
          {data && data.error && <div className="alert error"><Icon name="alert" />{data.error}</div>}
          {data && !shown.length && !data.error && (
            <div className="no-results">
              <h2>No results{q ? <> for "{q}"</> : ''}</h2>
              <p className="muted">Check the spelling, try a more general word, or <Link to="/s">browse every product</Link>.</p>
            </div>
          )}
          <div className="results">{shown.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      </div>
    </div>
  );
}
