const MAX_TEX_BYTES = 256 * 1024;
const TIMEOUT_MS = 30_000;

export async function compilePdf(tex: string): Promise<Buffer> {
  const url = process.env.COMPILE_SERVICE_URL;
  const secret = process.env.COMPILE_SERVICE_SECRET;
  if (!url || !secret) throw new Error('Missing COMPILE_SERVICE_URL or COMPILE_SERVICE_SECRET');
  if (Buffer.byteLength(tex, 'utf8') > MAX_TEX_BYTES) throw new Error('CV source too large');

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${url}/compile`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-tex' },
      body: tex,
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Compile service returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(t);
  }
}
