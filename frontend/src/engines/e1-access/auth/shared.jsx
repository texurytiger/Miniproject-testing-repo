import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, homeFor, PORTALS } from '../../../app/AuthContext';
import { isLocal } from '../../../app/api';
import Icon from '../../../app/Icons';

export { isLocal };
export const DEMO_PW = 'Password@123';

/**
 * Sign-in logic shared by all four sign-in pages (FR-02).
 * The page decides portal + role; the SERVER compares them with the account and answers 401 if they differ.
 *
 * Errors are split three ways so the customer always knows whose problem it is:
 *   - wrong email/password  -> shown on the password field (red border), no banner
 *   - account problems       -> red banner (deactivated, locked, wrong sign-in page)
 *   - our problems           -> neutral banner that says plainly it is not their fault
 */
export function useSignIn(portal, role) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);       // { text, hint?, ours?, dev? }
  const [fieldErr, setFieldErr] = useState({});

  async function signIn(email, password, pickedRole = role) {
    setError(null); setFieldErr({}); setBusy(true);
    try {
      const me = await login(email.trim(), password, portal, portal === 'staff' ? pickedRole : undefined);
      const next = params.get('next');
      navigate(next && next.startsWith('/') && !next.startsWith('//') ? next : homeFor(me.user.role), { replace: true });
    } catch (err) {
      if (err.ours) setError({ ours: true, text: err.message, dev: err.devInfo });
      else if (err.code === 'BAD_CREDENTIALS') setFieldErr({ password: err.message.replace('Incorrect email or password.', "That email and password don't match.") || err.message });
      else if (err.code === 'VALIDATION' && err.details) setFieldErr(err.details);
      else setError({ text: err.message, hint: err.details && err.details.portalHint });
    } finally { setBusy(false); }
  }
  const clearField = (k) => setFieldErr((f) => { if (!f[k]) return f; const n = { ...f }; delete n[k]; return n; });
  return { signIn, busy, error, fieldErr, setFieldErr, setError, clearField };
}

/** Banner for account problems (red) and our problems (neutral, "not your fault"). */
export function SignInError({ error }) {
  if (!error) return null;
  if (error.ours) {
    return (
      <div className="auth-alert ours" role="alert">
        <Icon name="info" />
        <div>
          <b>It's not you, it's us</b>
          <span>{error.text}</span>
          {isLocal && error.dev && <span className="dev-hint">For developers: {error.dev}</span>}
        </div>
      </div>
    );
  }
  const portal = error.hint && PORTALS[error.hint];
  return (
    <div className="auth-alert" role="alert">
      <Icon name="alert" />
      <div>
        <b>We couldn't sign you in</b>
        <span>{error.text}</span>
        {portal && <span>This is a {error.hint.toLowerCase().replace('_', ' ')} account. <Link to={portal.to}>Go to {portal.label} →</Link></span>}
      </div>
    </div>
  );
}

/** Password field with show/hide, a Caps Lock warning, and a red state when invalid. */
export function PasswordInput({ value, onChange, autoComplete = 'current-password', autoFocus, id, placeholder, invalid, ok }) {
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const onKey = (e) => setCaps(!!(e.getModifierState && e.getModifierState('CapsLock')));
  return (
    <>
      <div className={`pw ${invalid ? 'bad' : ''} ${ok ? 'good' : ''}`}>
        <input id={id} type={show ? 'text' : 'password'} value={value} onChange={onChange} onKeyUp={onKey} onKeyDown={onKey}
          autoComplete={autoComplete} autoFocus={autoFocus} placeholder={placeholder} aria-invalid={!!invalid} required />
        <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? 'Hide' : 'Show'}</button>
      </div>
      {caps && <span className="caps-warn"><Icon name="alert" />Caps Lock is on</span>}
    </>
  );
}

export function FieldError({ children }) {
  if (!children) return null;
  return <span className="field-error" role="alert"><Icon name="alert" />{children}</span>;
}

/** Seeded demo accounts, shown only when running on this computer. */
export function DemoAccounts({ accounts, onPick, dark }) {
  if (!isLocal) return null;
  return (
    <div className={`demo-acc ${dark ? 'dark' : ''}`}>
      <span>Demo accounts · password <code>{DEMO_PW}</code></span>
      <div>{accounts.map(([email, label, role]) => <button type="button" key={email + label} onClick={() => onPick(email, role)}>{label}</button>)}</div>
    </div>
  );
}
