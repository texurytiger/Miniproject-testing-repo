import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth, homeFor } from '../../../app/AuthContext';
import Icon from '../../../app/Icons';
import { Wordmark } from '../../../storefront/StoreLayout';
import ProductArt from '../../../storefront/ProductArt';
import { DEMO_PW, DemoAccounts, FieldError, PasswordInput, SignInError, useSignIn } from './shared';
import { BRAND } from '../../../config';

/** FR-02 Seller Central sign-in (portal staff, role SELLER). */
export default function SellerLogin() {
  const { me } = useAuth();
  const { signIn, busy, error, fieldErr, setFieldErr, clearField } = useSignIn('staff', 'SELLER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  if (me) return <Navigate to={homeFor(me.user.role)} replace />;

  return (
    <div className="seller-auth">
      <header className="sa-top">
        <Link to="/" className="sa-logo"><Wordmark sub="seller central" /></Link>
        <span className="spacer" />
        <Link to="/" className="sa-link">Visit the store</Link>
      </header>
      <div className="sa-main">
        <section className="sa-pitch">
          <span className="eyebrow">For sellers</span>
          <h1>Run your shop from one place.</h1>
          <ul>
            <li><Icon name="box" /><span><b>Listings and stock</b>Change prices and quantities; the storefront updates at once.</span></li>
            <li><Icon name="lock" /><span><b>Only you edit your products</b>Every change is checked against the listing's owner on the server.</span></li>
            <li><Icon name="scroll" /><span><b>Everything is recorded</b>Each action you take is written to the platform's audit log.</span></li>
          </ul>
          <div className="sa-art">
            <ProductArt image="backpack" category="fashion" />
            <ProductArt image="lamp" category="electronics" />
            <ProductArt image="mug" category="home" />
          </div>
        </section>
        <section className="sa-card">
          <h2>Sign in</h2>
          <p className="muted small">Use the email registered to your seller account.</p>
          <SignInError error={error} />
          <form onSubmit={(e) => { e.preventDefault(); if (!email.trim() || !password) { setFieldErr({ ...(!email.trim() ? { email: 'Enter your email' } : {}), ...(!password ? { password: 'Enter your password' } : {}) }); return; } signIn(email, password); }} noValidate>
            <label htmlFor="em">Email</label>
            <input id="em" type="email" value={email} onChange={(e) => { setEmail(e.target.value); clearField('email'); }} autoComplete="username" autoFocus className={fieldErr.email ? 'bad' : ''} />
            <FieldError>{fieldErr.email && (fieldErr.email.startsWith('is ') ? `Email ${fieldErr.email}` : fieldErr.email)}</FieldError>
            <label htmlFor="pw">Password</label>
            <PasswordInput id="pw" value={password} onChange={(e) => { setPassword(e.target.value); clearField('password'); }} invalid={!!fieldErr.password} />
            <FieldError>{fieldErr.password}</FieldError>
            <button className="btn primary block lg" disabled={busy}>{busy ? 'Signing in…' : 'Sign in to Seller Central'}</button>
          </form>
          <div className="sa-help">
            <span>Not a seller yet?</span>
            <span className="muted small">Seller accounts are created by the {BRAND.short} admin team. Shopping instead? <Link to="/login">Customer sign-in</Link></span>
          </div>
          <DemoAccounts
            accounts={[['seller1@team3.test', 'Kavya Crafts'], ['seller2@team3.test', 'Nilgiri Goods'], ['customer@team3.test', 'Customer (wrong page)']]}
            onPick={(em) => { setEmail(em); setPassword(DEMO_PW); }}
          />
        </section>
      </div>
      <footer className="sa-foot">© 2026 {BRAND.name} · Seller Central</footer>
    </div>
  );
}
