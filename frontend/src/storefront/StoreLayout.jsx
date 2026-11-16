import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, homeFor } from '../app/AuthContext';
import { api } from '../app/api';
import Icon from '../app/Icons';
import { BRAND } from '../config';
import { useCart } from './cart';

export function Wordmark({ sub }) {
  return <span className="wordmark">{BRAND.short}<b>.</b>{sub && <small>{sub}</small>}</span>;
}

function AccountMenu() {
  const { me, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const first = me ? me.user.name.split(' ')[0] : null;
  return (
    <div className="acct" ref={ref} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button className="hd-act" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu">
        <Icon name="user" />
        <span className="hd-act-txt"><small>{me ? `Hi, ${first}` : 'Welcome'}</small><b>{me ? 'Account' : 'Sign in'}</b></span>
      </button>
      {open && (
        <div className="acct-pop" role="menu">
          {!me ? (
            <div className="acct-signin">
              <Link className="btn primary block" to="/login">Sign in</Link>
              <span className="small">New here? <Link to="/register">Create an account</Link></span>
            </div>
          ) : (
            <div className="acct-who"><b>{me.user.name}</b><span>{me.user.email}</span></div>
          )}
          <nav className="acct-links">
            <Link to="/account"><Icon name="user" />Your account</Link>
            <Link to="/account#orders"><Icon name="box" />Orders &amp; returns</Link>
            <Link to="/account#security"><Icon name="lock" />Login &amp; security</Link>
            {me && me.user.role !== 'CUSTOMER' && <Link to={homeFor(me.user.role)}><Icon name="briefcase" />Go to your workspace</Link>}
            {me && <button className="linkish" onClick={async () => { await logout(); navigate('/'); }}><Icon name="logout" />Sign out</button>}
          </nav>
        </div>
      )}
    </div>
  );
}

export default function StoreLayout() {
  const { count } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState(params.get('q') || '');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => { api('/catalog/categories', { auth: false }).then((d) => setCats(d.categories)).catch(() => setCats([])); }, []);
  useEffect(() => { setQ(params.get('q') || ''); }, [params]);
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  const search = (e) => {
    e.preventDefault();
    const s = new URLSearchParams();
    if (q.trim()) s.set('q', q.trim());
    const cat = params.get('category');
    if (cat && pathname === '/s') s.set('category', cat);
    navigate(`/s?${s}`);
  };
  const activeCat = pathname === '/s' ? params.get('category') : null;

  return (
    <div className="store">
      <div className="strip">
        <span className="strip-msg"><Icon name="truck" />Free delivery on your first order · 7-day returns</span>
        <nav className="strip-links">
          <Link to="/seller/login">Sell with us</Link>
          <Link to="/staff/login">Staff sign-in</Link>
          <Link to="/admin/login">Admin</Link>
        </nav>
      </div>
      <header className={`hd ${scrolled ? 'scrolled' : ''}`}>
        <div className="hd-main">
          <Link to="/" className="hd-logo" aria-label={`${BRAND.name} home`}><Wordmark /></Link>
          <form className="hd-search" onSubmit={search} role="search">
            <Icon name="search" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products, brands and more" aria-label="Search products" />
            <button className="btn primary small">Search</button>
          </form>
          <nav className="hd-acts">
            <AccountMenu />
            <Link to="/account#orders" className="hd-act hide-sm"><Icon name="box" /><span className="hd-act-txt"><small>Returns</small><b>Orders</b></span></Link>
            <Link to="/cart" className="hd-act" aria-label={`Bag, ${count} items`}>
              <span className="bag"><Icon name="cart" />{count > 0 && <b>{count}</b>}</span>
              <span className="hd-act-txt"><small>{count} item{count === 1 ? '' : 's'}</small><b>Bag</b></span>
            </Link>
          </nav>
        </div>
        <nav className="hd-cats" aria-label="Departments">
          <NavLink to="/s" end className={() => (pathname === '/s' && !activeCat ? 'on' : '')}>Shop all</NavLink>
          {cats.map((c) => <NavLink key={c.slug} to={`/s?category=${c.slug}`} className={() => (activeCat === c.slug ? 'on' : '')}>{c.name}</NavLink>)}
          <NavLink to="/s?sort=deal" className="deals">Deals</NavLink>
        </nav>
      </header>

      <main><Outlet /></main>

      <footer className="ft">
        <div className="ft-inner">
          <div className="ft-brand">
            <Wordmark />
            <p>{BRAND.tagline}</p>
            <button className="ft-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to top ↑</button>
          </div>
          <div><h4>Shop</h4><Link to="/s">All products</Link><Link to="/s?sort=deal">Deals</Link><Link to="/cart">Your bag</Link></div>
          <div><h4>Help</h4><Link to="/account">Your account</Link><Link to="/account#orders">Orders &amp; returns</Link><a href={`mailto:${BRAND.supportEmail}`}>Contact support</a></div>
          <div><h4>Sell</h4><Link to="/seller/login">Seller Central</Link><Link to="/seller/login">Start selling</Link></div>
          <div><h4>Team</h4><Link to="/staff/login">Staff sign-in</Link><Link to="/admin/login">Admin console</Link></div>
        </div>
        <div className="ft-base"><span>© 2026 {BRAND.name}</span><span>{BRAND.footerNote}</span></div>
      </footer>
    </div>
  );
}
