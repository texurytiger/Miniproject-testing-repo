import Icon from '../../../app/Icons';

/** Plain-English meaning of each reason code returned by authorize(). */
export const REASONS = {
  GRANTED: 'Your role, or a role above it in the tree, holds this permission.',
  GRANTED_OWN: 'You hold only the _own version, and the row belongs to you, so it is allowed for this row only.',
  NOT_OWNER: 'You hold only the _own version, and this row belongs to someone else.',
  NO_PERMISSION: 'No role in your chain holds this permission. Deny by default.',
  NO_TOKEN: 'No valid token was sent. Unknown callers are always denied.',
  FAIL_CLOSED: 'The permission cache or the audit log was unavailable, so E1 refused rather than guess.',
  WRONG_PORTAL: 'The account signed in on the wrong portal.',
  ROLE_MISMATCH: 'The role picked at sign-in did not match the role on the account.',
  BAD_CREDENTIALS: 'Wrong email or password.',
  INACTIVE: 'The account is deactivated.',
};

export function Decision({ value }) {
  const allow = value === 'ALLOW';
  return <span className={`badge ${allow ? 'allow' : 'deny'} dot`}>{value}</span>;
}

export function PageHead({ title, fr, lead, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}{fr && <span className="fr">{fr}</span>}</h1>
        {lead && <p className="lead">{lead}</p>}
      </div>
      <span className="spacer" />
      {children}
    </div>
  );
}

export function Alert({ msg }) {
  if (!msg) return null;
  const icon = msg.type === 'ok' ? 'check' : msg.type === 'error' ? 'alert' : 'info';
  return <div className={`alert ${msg.type}`} role={msg.type === 'error' ? 'alert' : 'status'}><Icon name={icon} />{msg.text}</div>;
}

export const fmtTime = (t) => new Date(t).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
