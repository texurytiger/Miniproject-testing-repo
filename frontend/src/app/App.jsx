import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import modules from '../engines';
import ConsoleLayout from './Layout';
import StoreLayout from '../storefront/StoreLayout';
import PortalLayout from '../storefront/portals/PortalLayout';
import Icon from './Icons';

/** Sign-in page for each area, used when a signed-out visitor opens a protected page. */
const LOGIN_FOR = { console: '/admin/login', seller: '/seller/login', ops: '/staff/login', store: '/login' };

function Denied({ me, permission }) {
  return (
    <div className="denied">
      <span className="badge deny dot">403 · Access denied</span>
      <h1>This page isn't available to your account</h1>
      <p className="muted">
        You are signed in as <b>{me.user.email}</b> ({me.user.role}).
        {permission ? <> This page needs <code>{permission}</code>, which no role in your chain holds.</> : ' Your role cannot open this area.'}
      </p>
      <a className="btn" href="/"><Icon name="arrow" />Back to the store</a>
    </div>
  );
}

/** Route guard: login required, optionally one permission or a list of roles (UI only; the API re-checks every call). */
function Protected({ route, children }) {
  const { me, loading, can } = useAuth();
  const { pathname, search } = useLocation();
  if (loading) return <div className="center muted">Loading…</div>;
  if (!me) return <Navigate to={`${LOGIN_FOR[route.layout] || '/login'}?next=${encodeURIComponent(pathname + search)}`} replace />;
  if ((route.permission && !can(route.permission)) || (route.roles && !route.roles.includes(me.user.role))) return <Denied me={me} permission={route.permission} />;
  return children;
}

const LAYOUTS = {
  store: StoreLayout,
  console: ConsoleLayout,
  seller: (p) => <PortalLayout kind="seller" {...p} />,
  ops: (p) => <PortalLayout kind="ops" {...p} />,
};

export default function App() {
  const routes = modules.flatMap((m) => m.routes);
  const wrap = (r) => (r.public ? r.element : <Protected route={r}>{r.element}</Protected>);
  return (
    <Routes>
      {routes.filter((r) => r.layout === 'bare').map((r) => <Route key={r.path} path={r.path} element={wrap(r)} />)}
      {Object.entries(LAYOUTS).map(([name, L]) => (
        <Route key={name} element={<L />}>
          {routes.filter((r) => r.layout === name).map((r) => <Route key={r.path} path={r.path} element={wrap(r)} />)}
        </Route>
      ))}
      <Route element={<StoreLayout />}>
        <Route path="*" element={<div className="store-page"><div className="denied"><h1>We couldn't find that page</h1><p className="muted">The link may be old, or the page has moved.</p><a className="btn" href="/">Go to the homepage</a></div></div>} />
      </Route>
    </Routes>
  );
}
