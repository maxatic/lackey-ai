import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  process.env.COMPILE_SERVICE_URL = 'https://compile.example';
  process.env.COMPILE_SERVICE_SECRET = 'sek';
  vi.restoreAllMocks();
});

it('POSTs the tex with the bearer secret and returns PDF bytes', async () => {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  const { compilePdf } = await import('./compile');
  const buf = await compilePdf('\\documentclass{article}\\begin{document}x\\end{document}');
  expect(buf.subarray(0, 4).toString()).toBe('%PDF');
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('https://compile.example/compile');
  expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer sek' });
});

it('throws on a non-200 response', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
  const { compilePdf } = await import('./compile');
  await expect(compilePdf('x')).rejects.toThrow(/500/);
});

it('throws if env vars are missing', async () => {
  delete process.env.COMPILE_SERVICE_URL;
  delete process.env.COMPILE_SERVICE_SECRET;
  const { compilePdf } = await import('./compile');
  await expect(compilePdf('x')).rejects.toThrow(/Missing COMPILE_SERVICE_URL/);
});

it('throws if tex exceeds max size', async () => {
  vi.stubGlobal('fetch', vi.fn());
  const { compilePdf } = await import('./compile');
  const huge = 'x'.repeat(256 * 1024 + 1);
  await expect(compilePdf(huge)).rejects.toThrow(/too large/);
});
