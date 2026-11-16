/**
 * FRONTEND MODULE REGISTRY.
 *
 * Each module exports { id, routes: [{ path, element, layout, public?, permission?, roles? }], nav?: [...] }.
 * layout = bare | store | console | seller | ops. App.jsx builds the router from this list.
 * Adding an engine's pages later = create frontend/src/engines/<engine>/index.jsx and add ONE line below.
 */
import e1 from './e1-access';
import storefront from '../storefront';
// import e2 from './e2-oops';   // E2 · orders, payments, state machines   — Sprint 2

export default [e1, storefront];
