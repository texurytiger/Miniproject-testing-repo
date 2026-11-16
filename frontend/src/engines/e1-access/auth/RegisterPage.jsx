import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth, homeFor } from '../../../app/AuthContext';
import Icon from '../../../app/Icons';
import { Wordmark } from '../../../storefront/StoreLayout';
import { BRAND } from '../../../config';
import { FieldError, PasswordInput, SignInError } from './shared';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * FR-01 Register. Always becomes CUSTOMER: there is no role field, and the server ignores one if sent.
 * Checks run while typing: the re-entered password turns red as soon as it stops matching.
 */
export default function RegisterPage() {
  const { me, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (me) return <Navigate to={homeFor(me.user.role)} replace />;
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setErrors((x) => ({ ...x, [k]: undefined })); };
  const blur = (k) => () => setTouched({ ...touched, [k]: true });

  const rules = { len: form.password.length >= 8, mix: /[A-Za-z]/.test(form.password) && /\d/.test(form.password) };
  // red while typing once the re-entered text can no longer become the password
  const confirmBad = form.confirm.length > 0 && !form.password.startsWith(form.confirm);
  const confirmShort = form.confirm.length > 0 && !confirmBad && form.confirm !== form.password;
  const confirmOk = form.confirm.length > 0 && form.confirm === form.password;
  const live = {
    name: touched.name && form.name.trim().length < 2 ? 'Enter your first and last name' : null,
    email: touched.email && form.email && !EMAIL.test(form.email.trim()) ? "That doesn't look like an email address" : null,
    password: touched.password && form.password && !(rules.len && rules.mix) ? 'Your password doesn\'t meet the rules below yet' : null,
    confirm: confirmBad ? "Passwords don't match" : touched.confirm && confirmShort ? "Passwords don't match yet" : null,
  };
  const err = (k) => errors[k] || live[k];

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setTouched({ name: true, email: true, password: true, confirm: true });
    const f = {};
    if (form.name.trim().length < 2) f.name = 'Enter your first and last name';
    if (!EMAIL.test(form.email.trim())) f.email = form.email ? "That doesn't look like an email address" : 'Enter your email address';
    if (!(rules.len && rules.mix)) f.password = 'Choose a password that meets the rules below';
    if (form.confirm !== form.password) f.confirm = "Passwords don't match";
    if (Object.keys(f).length) { setErrors(f); return; }
    setBusy(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password);
      navigate('/');
    } catch (ex) {
      if (ex.ours) setError({ ours: true, text: ex.message, dev: ex.devInfo });
      else if (ex.code === 'EMAIL_TAKEN') setErrors({ email: 'An account already uses this email. Sign in instead, or use another email.' });
      else if (ex.details) setErrors(Object.fromEntries(Object.entries(ex.details).map(([k, v]) => [k, `${k[0].toUpperCase()}${k.slice(1)} ${v}`])));
      else setError({ text: ex.message });
    } finally { setBusy(false); }
  }

  return (
    <div className="auth-page">
      <Link to="/" className="auth-logo" aria-label={`${BRAND.name} home`}><Wordmark /></Link>
      <SignInError error={error} />
      <div className="auth-box">
        <h1>Create account</h1>
        <form onSubmit={submit} noValidate>
          <label htmlFor="nm">Your name</label>
          <input id="nm" value={form.name} onChange={set('name')} onBlur={blur('name')} autoComplete="name" placeholder="First and last name" autoFocus className={err('name') ? 'bad' : ''} aria-invalid={!!err('name')} />
          <FieldError>{err('name')}</FieldError>

          <label htmlFor="em">Email address</label>
          <input id="em" type="email" value={form.email} onChange={set('email')} onBlur={blur('email')} autoComplete="email" className={err('email') ? 'bad' : ''} aria-invalid={!!err('email')} />
          {err('email') && <FieldError>{err('email')}{errors.email && errors.email.startsWith('An account') && <> <Link to="/login">Sign in</Link></>}</FieldError>}

          <label htmlFor="pw">Password</label>
          <PasswordInput id="pw" value={form.password} onChange={set('password')} autoComplete="new-password" invalid={!!err('password')} ok={rules.len && rules.mix} />
          <ul className="pw-rules">
            <li className={rules.len ? 'ok' : touched.password ? 'no' : ''}><Icon name={rules.len ? 'check' : 'x'} />At least 8 characters</li>
            <li className={rules.mix ? 'ok' : touched.password ? 'no' : ''}><Icon name={rules.mix ? 'check' : 'x'} />Letters and at least one number</li>
          </ul>

          <label htmlFor="pw2">Re-enter password</label>
          <div onBlur={blur('confirm')}>
            <PasswordInput id="pw2" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" invalid={!!err('confirm')} ok={confirmOk} />
          </div>
          {confirmOk ? <span className="field-ok"><Icon name="check" />Passwords match</span> : <FieldError>{err('confirm')}</FieldError>}

          <button className="btn primary block" disabled={busy}>{busy ? 'Creating your account…' : 'Create account'}</button>
        </form>
        <p className="auth-fine">Your password is stored only as a bcrypt hash. Nobody, including us, can read it.</p>
        <hr />
        <p className="small">Already have an account? <Link to="/login">Sign in</Link></p>
        <p className="small">Want to sell? <Link to="/seller/login">Seller Central</Link></p>
      </div>
      <footer className="auth-foot"><span>© 2026 {BRAND.name}</span></footer>
    </div>
  );
}
