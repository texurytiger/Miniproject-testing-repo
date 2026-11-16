/** Shared HTTP helpers: typed errors, async wrapper, tiny validators. */
class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME = /^[A-Z][A-Z0-9_]{1,38}$/;

/** Collects field errors; throw() raises one 400 with every problem at once. */
function validator() {
  const details = {};
  return {
    check(ok, field, msg) { if (!ok && !details[field]) details[field] = msg; return this; },
    throwIfAny() {
      if (Object.keys(details).length) throw new HttpError(400, 'VALIDATION', 'Please fix the highlighted fields.', details);
    },
  };
}

const toInt = (v) => (v === null || v === undefined || v === '' ? null : Number.isInteger(Number(v)) ? Number(v) : NaN);

module.exports = { HttpError, wrap, validator, EMAIL, NAME, toInt };
