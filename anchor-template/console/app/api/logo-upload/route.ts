import { put } from '@vercel/blob';

// Logo upload → Vercel Blob. The operator picks an image in Settings; we store it in Blob and
// return its public URL, which the settings flow then persists as the anchor's logo. This is a
// specific route, so it takes precedence over the /api/[...path] proxy. Server-side only — the
// BLOB_READ_WRITE_TOKEN never reaches the browser.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ACCEPT = new Set(['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp']);
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB — a logo, not a photo.

export async function POST(req: Request): Promise<Response> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return json(500, 'Logo uploads are not configured (missing BLOB_READ_WRITE_TOKEN).');

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return json(400, 'No file provided.');
  if (!ACCEPT.has(file.type)) return json(400, 'Use a PNG, SVG, JPG, or WebP image.');
  if (file.size > MAX_BYTES) return json(400, 'Image must be under 2 MB.');

  const ext = file.type === 'image/svg+xml' ? 'svg' : file.type.split('/')[1];
  const slug = process.env.ANCHOR_SLUG ?? 'anchor';
  try {
    const blob = await put(`logos/${slug}-${Date.now()}.${ext}`, file, {
      access: 'public',
      contentType: file.type,
      token,
    });
    return json(200, undefined, { url: blob.url });
  } catch (err) {
    return json(502, err instanceof Error ? err.message : 'Upload failed.');
  }
}

function json(status: number, error?: string, body?: Record<string, unknown>): Response {
  return new Response(JSON.stringify(error ? { error } : body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
