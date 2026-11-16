/**
 * npm run dev  ->  starts the API (port 4000) AND the website (port 5173) together, in one terminal.
 * Ctrl+C stops both. Works on Windows, macOS and Linux (no extra packages).
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const viteBin = join(dirname(require.resolve('vite/package.json')), 'bin', 'vite.js');
const procs = [];

function run(name, color, args) {
  const p = spawn(process.execPath, args, { stdio: ['inherit', 'pipe', 'pipe'], env: process.env });
  const tag = `\x1b[${color}m[${name}]\x1b[0m `;
  const pipe = (stream, out) => stream.on('data', (d) => d.toString().split(/\r?\n/).filter(Boolean).forEach((l) => out.write(tag + l + '\n')));
  pipe(p.stdout, process.stdout); pipe(p.stderr, process.stderr);
  p.on('exit', (code) => {
    process.stdout.write(`${tag}stopped (exit ${code}).${name === 'api' ? ' The website will show "can\'t reach the server" until it runs again.' : ''}\n`);
    if (name === 'web') stop();
  });
  procs.push(p);
}
function stop() { procs.forEach((p) => p.kill()); process.exit(0); }
process.on('SIGINT', stop); process.on('SIGTERM', stop);

run('api', 36, ['server/index.js']);
run('web', 35, [viteBin]);
