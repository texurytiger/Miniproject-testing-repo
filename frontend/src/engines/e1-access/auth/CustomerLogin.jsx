import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth, homeFor } from '../../../app/AuthContext';
import { Wordmark } from '../../../storefront/StoreLayout';
import { DEMO_PW, DemoAccounts, FieldError, PasswordInput, SignInError, useSignIn } from './shared';
import { BRAND } from '../../../config';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** FR-02 customer sign-in: email first, then password (two steps, like the big stores). */
export default function CustomerLogin() {
  const { me, notice } = useAuth();
  const { signIn, busy, error, fieldErr, setFieldErr, setError, clearField } = useSignIn('staff', 'CUSTOMER');
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (me) return <Navigate to={homeFor(me.user.role)} replace />;

  const next = (e) => {
    e.preventDefault();
    if (!email.trim()) { setFieldErr({ email: 'Enter your email address' }); return; }
    if (!EMAIL.test(email.trim())) { setFieldErr({ email: "That doesn't look like an email address. Check for typos." }); return; }
    setFieldErr({}); setError(null); setStep(2);
  };
  const submit = (e) => {
    e.preventDefault();
    if (!password) { setFieldErr({ password: 'Enter your password' }); return; }
    signIn(email, password);
  };

  return (
    <div className="auth-page">
      <Link to="/" className="auth-logo" aria-label={`${BRAND.name} home`}><Wordmark /></Link>
      {notice && <div className="auth-note">{notice}</div>}
      <SignInError error={error} />
      <div className="auth-box">
        <h1>Sign in</h1>
        {step === 1 ? (
          <form onSubmit={next} noValidate>
            <label htmlFor="em">Email address</label>
            <input id="em" type="email" value={email} onChange={(e) => { setEmail(e.target.value); clearField('email'); }} autoComplete="username" autoFocus className={fieldErr.email ? 'bad' : ''} aria-invalid={!!fieldErr.email} />
            <FieldError>{fieldErr.email}</FieldError>
            <button className="btn primary block">Continue</button>
          </form>
        ) : (
          <form onSubmit={submit} noValidate>
            <div className="auth-email">{email.trim()} <button type="button" className="linkish" onClick={() => { setStep(1); setPassword(''); setError(null); }}>Change</button></div>
            <label htmlFor="pw">Password</label>
            <PasswordInput id="pw" value={password} onChange={(e) => { setPassword(e.target.value); clearField('password'); }} autoFocus invalid={!!fieldErr.password} />
            <FieldError>{fieldErr.password}</FieldError>
            <button className="btn primary block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>
        )}
        <p className="auth-fine">By continuing, you agree to {BRAND.name}'s Conditions of Use and Privacy Notice.</p>
      </div>

      <div className="auth-divider"><span>New to {BRAND.short}?</span></div>
      <Link to="/register" className="btn block auth-alt">Create your account</Link>

      <DemoAccounts
        accounts={[['customer@team3.test', 'Customer'], ['inactive@team3.test', 'Deactivated customer'], ['seller1@team3.test', 'Seller (wrong page)']]}
        onPick={(em) => { setEmail(em); setPassword(DEMO_PW); setStep(2); setError(null); }}
      />

      <footer className="auth-foot">
        <nav><Link to="/seller/login">Seller Central</Link><Link to="/staff/login">Staff sign-in</Link><Link to="/admin/login">Admin console</Link></nav>
        <span>© 2026 {BRAND.name}</span>
      </footer>
    </div>
  );
}
