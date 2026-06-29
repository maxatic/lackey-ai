// smoke.mjs — local integration test against a running compile-service container
// Usage: COMPILE_SERVICE_SECRET=test node compile-service/smoke.mjs
// Prereq: docker run -e COMPILE_SERVICE_SECRET=test -p 8080:8080 cv-svc

const secret = process.env.COMPILE_SERVICE_SECRET;
if (!secret) { console.error('COMPILE_SERVICE_SECRET env var required'); process.exit(1); }

const tex = String.raw`\documentclass{article}\begin{document}hi\end{document}`;

const res = await fetch('http://localhost:8080/compile', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${secret}`,
    'Content-Type': 'application/x-tex',
  },
  body: tex,
});

if (!res.ok) {
  const body = await res.text();
  console.error(`FAIL: HTTP ${res.status} — ${body}`);
  process.exit(1);
}

const buf = Buffer.from(await res.arrayBuffer());
const magic = buf.slice(0, 4).toString('ascii');

if (magic !== '%PDF') {
  console.error(`FAIL: response does not start with %PDF (got: ${JSON.stringify(magic)})`);
  process.exit(1);
}

console.log(`OK: received ${buf.length} bytes, starts with ${magic}`);
