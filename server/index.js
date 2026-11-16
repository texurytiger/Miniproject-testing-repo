/**
 * Team 3 Store · API server (modular monolith: one backend, one module per engine, one MySQL database).
 *   npm start          -> API on http://localhost:4000 (and the built frontend, if frontend/dist exists)
 *   npm run dev        -> Vite dev server on http://localhost:5173, proxying /api to :4000
 */
const path = require('path');
const fs = require('fs');
const config = require('./config');              // first: loads .env and refuses unsafe production settings
const express = require('express');
const cache = require('./engines/e1-access/permissionCache');
const { authenticate } = require('./engines/e1-access/session');
const { HttpError } = require('./core/http');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);     // behind the host's HTTPS layer: real visitor IP + protocol
app.use(express.json({ limit: '100kb' }));
app.use((_req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY' });
  if (config.isProd) {
    // HTTPS only: browsers remember to never use plain HTTP for this site (1 year).
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    // Content-Security-Policy: only our own scripts run; fonts from Google Fonts. Limits damage if script is ever injected.
    res.set('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '));
  }
  next();
});

app.get('/api/health', (_req, res) => res.json({ ok: true, cacheReady: cache.state.ready }));
app.use('/api', authenticate);                                  // E1: who is calling (sets req.user)
app.use('/api/auth', require('./engines/e1-access/routes.auth'));
app.use('/api/admin', require('./engines/e1-access/routes.admin'));
app.use('/api', require('./engines/catalog/routes'));
app.use('/api', (_req, _res, next) => next(new HttpError(404, 'NOT_FOUND', 'No such API route.')));

// Serve the built React app (npm run build) from the same port.
const dist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// One error format for every engine: { error, message, details? }
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') err = new HttpError(400, 'BAD_JSON', 'Request body is not valid JSON.');
  if (!(err instanceof HttpError)) {
    console.error(err);
    const down = /^(ECONNREFUSED|ER_ACCESS_DENIED|ER_BAD_DB_ERROR|PROTOCOL_CONNECTION_LOST|ETIMEDOUT)/.test(err.code || '');
    err = down ? new HttpError(503, 'DB_DOWN', 'The database is not reachable. Is MySQL running in XAMPP?') : new HttpError(500, 'SERVER_ERROR', 'Something went wrong on our side.');
  }
  res.status(err.status).json({ error: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) });
});

const PORT = config.port;
cache.build()
  .then((s) => console.log(`[E1] permission cache ready: ${s.roles.size} roles in ${s.buildMs.toFixed(2)} ms${s.cycles.length ? ` · CYCLE: ${s.cycles.join(', ')}` : ''}`))
  .catch((e) => console.error(`[E1] permission cache NOT built: ${/ECONNREFUSED/.test(e.code) ? 'MySQL is not running. Start it in XAMPP, run npm run db:reset, then restart.' : e.message}\n     Until then every protected request is refused (fail closed).`))
  .finally(() => {
    const server = app.listen(PORT, () => console.log(`Team 3 Store API on http://localhost:${PORT}`));
    server.on('error', (e) => {
      console.error(e.code === 'EADDRINUSE' ? `Port ${PORT} is already in use: another copy of the server is probably still running. Close it and try again.` : e.message);
      process.exit(1);
    });
  });

module.exports = app;
