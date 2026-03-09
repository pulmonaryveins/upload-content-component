const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const app = express();

// Only allow requests from origins listed in ALLOWED_ORIGINS
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:4200').split(',');
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin / server-to-server requests (no origin header)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin "${origin}" not allowed`));
      }
    },
  }),
);

// ── GET /api/transloadit/params ──────────────────────────────────────────────
// Returns HMAC-SHA256 signed Transloadit assembly params valid for 30 minutes.
// The auth.key and auth_secret are read from the server .env and never sent
// to the browser.
app.get('/api/transloadit/params', (req, res) => {
  const { TRANSLOADIT_KEY, TRANSLOADIT_AUTH_SECRET, TRANSLOADIT_TEMPLATE_ID } = process.env;

  if (!TRANSLOADIT_KEY || !TRANSLOADIT_AUTH_SECRET || !TRANSLOADIT_TEMPLATE_ID) {
    console.error('Missing Transloadit env vars');
    return res.status(500).json({ error: 'Server misconfigured: missing Transloadit env vars' });
  }

  // Build expiry 30 minutes from now in Transloadit's format: YYYY/MM/DD HH:MM:SS+00:00
  const d = new Date(Date.now() + 30 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const expires = `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+00:00`;

  // Serialize params — this exact string is what gets signed and sent to Transloadit
  const params = JSON.stringify({
    auth: { key: TRANSLOADIT_KEY, expires },
    template_id: TRANSLOADIT_TEMPLATE_ID,
  });

  const signature =
    'sha256:' +
    crypto.createHmac('sha256', TRANSLOADIT_AUTH_SECRET).update(Buffer.from(params, 'utf-8')).digest('hex');

  res.json({ params, signature });
});

// ── GET /api/google-drive/config ─────────────────────────────────────────────
// Returns the Google Drive API key so it is not statically bundled in the
// Angular app. The clientId and projectNumber remain in the Angular environment
// file because they are public OAuth identifiers by design.
app.get('/api/google-drive/config', (req, res) => {
  const { GOOGLE_API_KEY } = process.env;

  if (!GOOGLE_API_KEY) {
    console.error('Missing GOOGLE_API_KEY env var');
    return res.status(500).json({ error: 'Server misconfigured: missing GOOGLE_API_KEY' });
  }

  res.json({ apiKey: GOOGLE_API_KEY });
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`Proxy server listening on http://localhost:${PORT}`));
