import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth, homeFor } from '../../../app/AuthContext';
import { api } from '../../../app/api';
import Icon from '../../../app/Icons';
import { Wordmark } from '../../../storefront/StoreLayout';
import { DEMO_PW, DemoAccounts, FieldError, PasswordInput, SignInError, useSignIn } from './shared';
import { BRAND } from '../../../config';

const LABEL = { FINANCE: 'Finance', WAREHOUSE_STAFF: 'Warehouse', CEO: 'Leadership' };
const ICON = { FINANCE: 'wallet', WAREHOUSE_STAFF: 'truck', CEO: 'briefcase' };

/**
 * FR-02 internal staff sign-in. The team is picked on the page (roles.staff_login = 1),
 * and the server checks the pick equals the role stored on the account.
 */
export default function StaffLogin() {
  const { me, notice } = useAuth();
  const [roles, setRoles] = useState([]);
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, busy, error, fieldErr, setFieldErr, clearField } = useSignIn('staff', role);

  useEffect(() => { api('/auth/staff-roles', { auth: false }).then((d) => { setRoles(d.roles); setRole((r) => r || (d.roles[0] && d.roles[0].name) || ''); }).catch(() => setRoles([])); }, []);
  if (me) return <Navigate to={homeFor(me.user.role)} replace />;

  const submit = (e) => {
    e.preventDefault();
    const f = {};
    if (!role) f.role = 'Choose your team';
    if (!email.trim()) f.email = 'Enter your work email';
    if (!password) f.password = 'Enter your password';
    if (Object.keys(f).length) { setFieldErr(f); return; }
    signIn(email, password, role);
  };

  return (
    <div className="staff-auth">
      <header className="st-top">
        <Wordmark sub="ops" />
        <span className="st-tag">Internal</span>
        <span className="spacer" />
        <Link to="/">Customer site</Link>
      </header>
      <main className="st-main">
        <div className="st-card">
          <h1>Staff sign-in</h1>
          <p className="muted small">For {BRAND.short} employees. Choose your team, then sign in with your work email.</p>
          {notice && <div className="auth-note">{notice}</div>}
          <SignInError error={error} />
          <form onSubmit={submit} noValidate>
            <span className="st-label">Team</span>
            <div className="st-roles" role="radiogroup" aria-label="Team">
              {roles.map((r) => (
                <button type="button" role="radio" aria-checked={role === r.name} key={r.name} className={role === r.name ? 'on' : ''} onClick={() => setRole(r.name)}>
                  <Icon name={ICON[r.name] || 'briefcase'} />
                  <b>{LABEL[r.name] || r.name}</b>
                  <span>{r.description}</span>
                </button>
              ))}
            </div>
            {!roles.length && <FieldError>Teams couldn't be loaded. This is a problem on our side; please try again shortly.</FieldError>}
            <FieldError>{fieldErr.role}</FieldError>
            <label htmlFor="em">Work email</label>
            <input id="em" type="email" value={email} onChange={(e) => { setEmail(e.target.value); clearField('email'); }} autoComplete="username" placeholder="name@company.com" className={fieldErr.email ? 'bad' : ''} />
            <FieldError>{fieldErr.email && (fieldErr.email.startsWith('is ') ? `Email ${fieldErr.email}` : fieldErr.email)}</FieldError>
            <label htmlFor="pw">Password</label>
            <PasswordInput id="pw" value={password} onChange={(e) => { setPassword(e.target.value); clearField('password'); }} invalid={!!fieldErr.password} />
            <FieldError>{fieldErr.password}</FieldError>
            <button className="btn primary block lg" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>
          <p className="st-legal"><Icon name="shield" />Authorised staff only. Every sign-in attempt, allowed or refused, is written to the audit log.</p>
          <DemoAccounts
            accounts={[['finance@team3.test', 'Finance', 'FINANCE'], ['warehouse@team3.test', 'Warehouse', 'WAREHOUSE_STAFF'], ['ceo@team3.test', 'CEO (no permissions)', 'CEO'], ['finance@team3.test', 'Finance picks Warehouse (fails)', 'WAREHOUSE_STAFF']]}
            onPick={(em, r) => { setEmail(em); setPassword(DEMO_PW); setRole(r); }}
          />
        </div>
      </main>
    </div>
  );
}
