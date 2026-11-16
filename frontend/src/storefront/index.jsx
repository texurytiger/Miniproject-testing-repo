import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import SellerHome from './portals/SellerHome';
import OpsHome from './portals/OpsHome';

/**
 * Storefront + staff workspaces. Browsing is public; the workspaces are guarded by E1
 * (seller needs product:create, ops is for internal staff roles). E2 takes over the business logic in Sprint 2.
 */
export default {
  id: 'storefront',
  routes: [
    { path: '/', element: <HomePage />, layout: 'store', public: true },
    { path: '/s', element: <SearchPage />, layout: 'store', public: true },
    { path: '/p/:id', element: <ProductPage />, layout: 'store', public: true },
    { path: '/cart', element: <CartPage />, layout: 'store', public: true },
    { path: '/seller', element: <SellerHome />, layout: 'seller', permission: 'product:create' },
    { path: '/ops', element: <OpsHome />, layout: 'ops', roles: ['FINANCE', 'WAREHOUSE_STAFF', 'CEO', 'ADMIN'] },
  ],
};
