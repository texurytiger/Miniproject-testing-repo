import { Link } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext';
import Icon from '../../app/Icons';
import ProductArt from '../ProductArt';
import { cart, rupees, useCart } from '../cart';

/**
 * Cart. Checkout needs order:create (E1). Placing the order itself is E2 + E3 work in Sprint 2,
 * so the button explains that instead of pretending to take payment.
 */
export default function CartPage() {
  const { me, can } = useAuth();
  const { items, count, total } = useCart();

  return (
    <div className="store-page cart-page">
      <section className="cart-list">
        <h1>Shopping cart</h1>
        {!items.length ? (
          <div className="no-results"><h2>Your cart is empty</h2><p className="muted"><Link to="/">Continue shopping</Link> — today's deals are on the homepage.</p></div>
        ) : (
          <>
            <div className="cart-head"><span /><span className="small muted">Price</span></div>
            {items.map((i) => (
              <div key={i.id} className="cart-row">
                <Link to={`/p/${i.id}`} className="cart-img"><ProductArt image={i.image} category={i.category} label={i.name} /></Link>
                <div>
                  <Link to={`/p/${i.id}`} className="cart-name">{i.name}</Link>
                  <span className="stock">In stock</span>
                  <div className="cart-ctl">
                    <select value={i.qty} onChange={(e) => cart.setQty(i.id, Number(e.target.value))} aria-label="Quantity">
                      {Array.from({ length: 10 }, (_, k) => <option key={k + 1} value={k + 1}>Qty: {k + 1}</option>)}
                    </select>
                    <button className="linkish" onClick={() => cart.setQty(i.id, 0)}>Delete</button>
                  </div>
                </div>
                <b className="cart-price">{rupees(i.price * i.qty)}</b>
              </div>
            ))}
            <div className="cart-sub">Subtotal ({count} item{count === 1 ? '' : 's'}): <b>{rupees(total)}</b></div>
          </>
        )}
      </section>
      {items.length > 0 && (
        <aside className="cart-box">
          <div className="cart-sub">Subtotal ({count} item{count === 1 ? '' : 's'}): <b>{rupees(total)}</b></div>
          {!me && <Link to="/login?next=/cart" className="btn primary block lg">Sign in to check out</Link>}
          {me && can('order:create') && (
            <>
              <button className="btn primary block lg" disabled>Proceed to buy</button>
              <p className="small muted">Checkout opens in Sprint 2, when order placement (E2) and stock locking (E1 + E3) are connected. Your account is already allowed to order.</p>
            </>
          )}
          {me && !can('order:create') && (
            <div className="alert error"><Icon name="lock" />Your account ({me.user.role}) cannot place orders. Sign in with a customer account to buy.</div>
          )}
        </aside>
      )}
    </div>
  );
}
