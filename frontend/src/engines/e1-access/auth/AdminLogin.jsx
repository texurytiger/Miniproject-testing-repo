import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth, homeFor } from '../../../app/AuthContext';
import Icon from '../../../app/Icons';
import { Wordmark } from '../../../storefront/StoreLayout';
import { DEMO_PW, DemoAccounts, FieldError, PasswordInput, SignInError, useSignIn } from './shared';
import { BRAND } from '../../../config';

/** FR-02 admin console sign-in (portal admin): only ADMIN accounts get through. */
export default function AdminLogin() {
  const { me, notice } = useAuth();
  const { signIn, busy, error, fieldErr, setFieldErr, clearField } = useSignIn('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  if (me) return <Navigate to={homeFor(me.user.role)} replace />;

  return (
    <div className="admin-auth">
      <div className="ad-wrap">
        <div className="ad-brand"><Wordmark sub="admin console" /></div>
        <div className="ad-card">
          <div className="ad-head"><span className="ad-lock"><Icon name="lock" /></span><div><h1>Administrator sign-in</h1><p>Users, roles, permissions and the audit log.</p></div></div>
          {notice && <div className="auth-note dark">{notice}</div>}
          <SignInError error={error} />
          <form onSubmit={(e) => { e.preventDefault(); if (!email.trim() || !password) { setFieldErr({ ...(!email.trim() ? { email: 'Enter your email' } : {}), ...(!password ? { password: 'Enter your password' } : {}) }); return; } signIn(email, password); }} noValidate>
            <label htmlFor="em">Email</label>
            <input id="em" type="email" value={email} onChange={(e) => { setEmail(e.target.value); clearField('email'); }} autoComplete="username" autoFocus className={fieldErr.email ? 'bad' : ''} />
            <FieldError>{fieldErr.email && (fieldErr.email.startsWith('is ') ? `Email ${fieldErr.email}` : fieldErr.email)}</FieldError>
            <label htmlFor="pw">Password</label>
            <PasswordInput id="pw" value={password} onChange={(e) => { setPassword(e.target.value); clearField('password'); }} invalid={!!fieldErr.password} />
            <FieldError>{fieldErr.password}</FieldError>
            <button className="btn light block lg" disabled={busy}>{busy ? 'Verifying…' : 'Sign in'}</button>
          </form>
          <p className="ad-legal">Restricted system. Only administrator accounts are accepted; every attempt is recorded with its time and IP address.</p>
          <DemoAccounts dark accounts={[['admin@team3.test', 'Admin'], ['finance@team3.test', 'Finance (refused)']]} onPick={(em) => { setEmail(em); setPassword(DEMO_PW); }} />
        </div>
        <Link to="/" className="ad-back">← Back to {BRAND.name}</Link>
      </div>
    </div>
  );
}
