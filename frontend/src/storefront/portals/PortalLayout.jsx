import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext';
import Icon, { initials } from '../../app/Icons';
import { Wordmark } from '../StoreLayout';

/** Tabs per workspace. Each tab shows only if the role holds its permission (the API re-checks every call). */
export const TABS = {
  seller: [
    { id: 'inventory', label: 'Inventory', permission: 'product:create' },
    { id: 'orders', label: 'Orders', permission: 'product:create' },
    { id: 'payments', label: 'Payments', permission: 'product:create' },
  ],
  ops: [
    { id: 'stock', label: 'Stock', permission: 'stock:read' },
    { id: 'orders', label: 'Orders', permission: 'order:read' },
    { id: 'refunds', label: 'Refunds', permission: 'refund:approve' },
    { id: 'payments', label: 'Payments', permission: 'payment:read' },
    { id: 'reports', label: 'Reports', permission: 'report:read' },
  ],
};

export default function PortalLayout({ kind }) {
  const { me, can, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  if (!me) return <Outlet />;
  const tabs = TABS[kind].filter((t) => can(t.permission));
  const base = kind === 'seller' ? '/seller' : '/ops';

  return (
    <div className={`portal ${kind}`}>
      <header className="pt-top">
        <Link to={base} className="pt-logo"><Wordmark sub={kind === 'seller' ? 'seller central' : 'ops'} /></Link>
        <nav className="pt-tabs">
          {tabs.map((t) => <NavLink key={t.id} to={`${base}?tab=${t.id}`} className={() => (new URLSearchParams(window.location.search).get('tab') || tabs[0].id) === t.id ? 'active' : ''}>{t.label}</NavLink>)}
        </nav>
        <span className="spacer" />
        <Link to="/" className="pt-store"><Icon name="store" />View store</Link>
        <div className="pt-user" ref={ref}>
          <button onClick={() => setOpen(!open)} aria-expanded={open}><span className="avatar">{initials(me.user.name)}</span><span className="pt-who"><b>{me.user.name}</b><small>{me.user.role.replace('_', ' ').toLowerCase()}</small></span><Icon name="down" /></button>
          {open && (
            <div className="pt-menu">
              <Link to="/account#security">Login &amp; security</Link>
              <Link to="/account#access">Your access</Link>
              <button className="linkish" onClick={async () => { await logout(); navigate(kind === 'seller' ? '/seller/login' : '/staff/login'); }}>Sign out</button>
            </div>
          )}
        </div>
      </header>
      <main className="pt-page"><Outlet /></main>
    </div>
  );
}
