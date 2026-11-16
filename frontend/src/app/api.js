/**
 * One fetch wrapper for every page.
 *  - adds the JWT from localStorage
 *  - parses JSON and throws ApiError on 4xx/5xx
 *  - ApiError.ours = true when the problem is on OUR side (server down, crash, no network to us),
 *    so pages can tell the customer "this isn't your fault" instead of blaming their password
 *  - a 401 on a signed-in call clears the session (expired / revoked token)
 */
const TOKEN_KEY = 'team3.token';
export const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

export class ApiError extends Error {
  constructor(status, code, message, details, ours = false, devInfo = '') {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.ours = ours;
    this.devInfo = devInfo;
  }
}

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* private mode */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};

const OUR_FAULT = 'Something went wrong on our side, not with your details. Please try again in a minute.';
const DEV_HINT = {
  SERVER_DOWN: 'The API server is not running. Run "npm run dev" (it starts the server and the website together).',
  DB_DOWN: 'MySQL is not reachable. Start MySQL in XAMPP, run "npm run db:reset", then restart the server.',
  FAIL_CLOSED: 'The permission cache is not built (usually MySQL was down when the server started). Restart the server.',
};

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = tokenStore.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'NETWORK', "We can't reach the store right now. Check your internet connection and try again.", null, true,
      'fetch() failed: the website itself is not being served, or the browser is offline.');
  }
  let data = null;
  try { data = await res.json(); } catch { /* not JSON: proxy error page, crash, etc. */ }
  if (!res.ok) {
    if (res.status === 401 && auth && token) window.dispatchEvent(new Event('team3:unauthorized'));
    const code = (data && data.error) || (res.status >= 500 ? 'SERVER_DOWN' : 'ERROR');
    if (res.status >= 500) {
      throw new ApiError(res.status, code, OUR_FAULT, null, true, DEV_HINT[code] || (data && data.message) || `HTTP ${res.status} with no details. Check the server terminal.`);
    }
    throw new ApiError(res.status, code, (data && data.message) || `Request failed (${res.status})`, data && data.details);
  }
  return data || {};
}

/**
 * Raw call that never touches the stored session: used by the self-test page,
 * which logs in as several demo users side by side. Returns { status, data } and never throws on 4xx.
 */
export async function rawCall(method, path, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const res = await fetch(`/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    let data = {};
    try { data = await res.json(); } catch { /* empty */ }
    return { status: res.status, data };
  } catch {
    return { status: 0, data: { message: 'server not reachable' } };
  }
}
