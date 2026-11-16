import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import modules from '../engines';
import Icon, { initials } from './Icons';

/**
 * Admin console shell: left sidebar built from every module's console nav entries.
 * Links the user's role may not use are hidden (the API still re-checks every call).
 */
export default function ConsoleLayout() {
  const { me, can, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const links = modules.flatMap((m) => m.nav || []).filter((l) => l.area === 'console' && (!l.permission || can(l.permission)));
  const sections = [...new Set(links.map((l) => l.section || 'General'))];
  const current = links.find((l) => pathname.startsWith(l.to));

  if (!me || !links.length) return <div className="store-page"><Outlet /></div>;
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark serif-mark">t3</div>
          <div>Team3 Store<small>Admin console</small></div>
        </div>
        {sections.map((s) => (
          <div key={s}>
            <div className="nav-section">{s}</div>
            <nav className="nav">
              {links.filter((l) => (l.section || 'General') === s).map((l) => (
                <NavLink key={l.to} to={l.to}><Icon name={l.icon} />{l.label}</NavLink>
              ))}
            </nav>
          </div>
        ))}
        <div className="nav-section">Store</div>
        <nav className="nav"><a href="/"><Icon name="home" />Open storefront</a></nav>
        <div className="side-foot">
          <div className="avatar">{initials(me.user.name)}</div>
          <div className="who"><b>{me.user.name}</b><span>{me.user.role}</span></div>
          <button className="icon-btn" title="Sign out" aria-label="Sign out" onClick={async () => { await logout(); navigate('/admin/login'); }}>
            <Icon name="logout" />
          </button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <span className="crumb">{current ? <>{current.section} / <b>{current.label}</b></> : 'Admin console'}</span>
          <span className="spacer" />
          <span className="badge role dot">{me.user.role}</span>
          <span className="muted small">{me.user.email}</span>
        </header>
        <main className="page"><Outlet /></main>
      </div>
    </div>
  );
}
