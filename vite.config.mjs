import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The React app lives in frontend/. /api calls go to the Express server on :4000.
// If that server is not running, answer with a clear JSON error instead of a bare 500.
export default defineConfig({
  root: 'frontend',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if (res.headersSent) return;
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'SERVER_DOWN', message: 'The API server is not running. Start it with npm run dev (or npm start).' }));
          });
        },
      },
    },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
