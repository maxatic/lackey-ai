import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SECRET = process.env.COMPILE_SERVICE_SECRET;
const MAX_BYTES = 256 * 1024;
const TIMEOUT_MS = 25_000;

if (!SECRET) { console.error('COMPILE_SERVICE_SECRET required'); process.exit(1); }

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('too large')); req.destroy(); }
      else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function compile(texPath, cwd) {
  return new Promise((resolve, reject) => {
    // ponytail: no shell-escape flag needed — tectonic disables it by default
    const p = spawn('tectonic', ['-X', 'compile', texPath, '--outdir', cwd, '--chatter', 'minimal'], { cwd });
    let err = '';
    const timer = setTimeout(() => { p.kill('SIGKILL'); reject(new Error('compile timeout')); }, TIMEOUT_MS);
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => {
      clearTimeout(timer);
      code === 0 ? resolve() : reject(new Error('tectonic failed: ' + err.slice(0, 500)));
    });
  });
}

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') { res.writeHead(200).end('ok'); return; }
  if (req.method !== 'POST' || req.url !== '/compile') { res.writeHead(404).end(); return; }
  if (req.headers.authorization !== `Bearer ${SECRET}`) { res.writeHead(401).end('unauthorized'); return; }

  let dir;
  try {
    const tex = await readBody(req, MAX_BYTES);
    dir = await mkdtemp(join(tmpdir(), 'cv-'));
    const texPath = join(dir, 'cv.tex');
    await writeFile(texPath, tex);
    await compile(texPath, dir);
    const pdf = await readFile(join(dir, 'cv.pdf'));
    res.writeHead(200, { 'Content-Type': 'application/pdf' }).end(pdf);
  } catch (e) {
    res.writeHead(e.message === 'too large' ? 413 : 500).end(String(e.message).slice(0, 300));
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});

server.listen(8080, () => console.log('compile-service on :8080'));
