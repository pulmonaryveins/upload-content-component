/**
 * Vercel serverless proxy for Facebook CDN downloads.
 *
 * Facebook CDN (*.fbcdn.net) does not send CORS headers, so browser fetch()
 * calls are blocked. This endpoint fetches the file server-side and pipes it
 * back to the client.
 *
 * Usage: GET /api/facebook/download?url=<encoded-facebook-cdn-url>
 */

const ALLOWED_CDN_SUFFIX = '.fbcdn.net';
const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB guard

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Security: only proxy Facebook CDN domains
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  if (!parsed.hostname.endsWith(ALLOWED_CDN_SUFFIX)) {
    return res.status(403).json({ error: 'Only Facebook CDN URLs are allowed' });
  }

  if (parsed.protocol !== 'https:') {
    return res.status(403).json({ error: 'Only HTTPS URLs are allowed' });
  }

  let upstream;
  try {
    upstream = await fetch(url);
  } catch (err) {
    return res.status(502).json({ error: `Upstream fetch failed: ${err.message}` });
  }

  if (!upstream.ok) {
    return res.status(upstream.status).json({ error: `Facebook CDN returned ${upstream.status}` });
  }

  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
  const buffer = await upstream.arrayBuffer();

  if (buffer.byteLength > MAX_FILE_BYTES) {
    return res.status(413).json({ error: 'File too large' });
  }

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', buffer.byteLength);
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.send(Buffer.from(buffer));
};
