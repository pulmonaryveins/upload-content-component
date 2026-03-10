/* eslint-disable @typescript-eslint/no-explicit-any */
declare const Box: any;

import { loadScript } from './script-loader.utils';

const BOX_CDN_VERSION = '17.0.0';
const BOX_CDN = `https://cdn01.boxcdn.net/platform/elements/${BOX_CDN_VERSION}/en-US`;
const PICKER_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// ── SDK bootstrap ─────────────────────────────────────────────────────────────

async function loadBoxSdk(): Promise<void> {
  // Load CSS once
  if (!document.getElementById('box-picker-css')) {
    const link = document.createElement('link');
    link.id = 'box-picker-css';
    link.rel = 'stylesheet';
    link.href = `${BOX_CDN}/picker.css`;
    document.head.appendChild(link);
  }
  // Load JS — exposes window.Box
  await loadScript('box-picker-js', `${BOX_CDN}/picker.js`);
}

// ── OAuth (PKCE) ───────────────────────────────────────────────────────────────

function generateCodeVerifier(): string {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const res = await fetch('https://api.box.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Box token exchange failed (HTTP ${res.status}): ${text}`);
  }

  const json = await res.json();
  if (!json.access_token) {
    throw new Error('No access_token in Box token response');
  }
  return json.access_token as string;
}

async function getBoxAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const redirectUri = `${window.location.origin}/box-auth.html`;
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const authUrl =
    `https://account.box.com/api/oauth2/authorize` +
    `?response_type=code` +
    `&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&code_challenge_method=S256` +
    `&code_challenge=${codeChallenge}`;

  return new Promise((resolve, reject) => {
    const popup = window.open(authUrl, 'box-auth', 'width=620,height=720,left=200,top=80');
    if (!popup) {
      reject(new Error('Popup was blocked. Allow popups for this site and try again.'));
      return;
    }

    const timeout = setTimeout(() => {
      clearInterval(poll);
      popup.close();
      reject(new Error('Box login timed out'));
    }, PICKER_TIMEOUT_MS);

    const poll = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(poll);
          clearTimeout(timeout);
          reject(new Error('Login was cancelled'));
          return;
        }
        // Readable once Box redirects back to our origin
        const search = popup.location.search;
        if (search.includes('code=')) {
          clearInterval(poll);
          clearTimeout(timeout);
          popup.close();
          const params = new URLSearchParams(search.substring(1));
          const code = params.get('code');
          if (!code) {
            reject(new Error('No authorization code in Box response'));
            return;
          }
          exchangeCodeForToken(code, codeVerifier, clientId, clientSecret, redirectUri)
            .then(resolve)
            .catch(reject);
        } else if (search.includes('error=')) {
          clearInterval(poll);
          clearTimeout(timeout);
          popup.close();
          const params = new URLSearchParams(search.substring(1));
          reject(new Error(params.get('error_description') ?? params.get('error') ?? 'Box auth error'));
        }
      } catch {
        // Cross-origin restriction fires until Box redirects back to our origin
      }
    }, 300);
  });
}

// ── Download ──────────────────────────────────────────────────────────────────

async function getBoxDownloadUrl(fileId: string, token: string): Promise<string> {
  // Fetch file metadata — Box returns a pre-signed `download_url` field that
  // points directly to the CDN without needing an Authorization header.
  const res = await fetch(
    `https://api.box.com/2.0/files/${fileId}?fields=download_url`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    throw new Error(`Could not get file metadata (HTTP ${res.status})`);
  }
  const data = await res.json();
  if (!data.download_url) {
    throw new Error('Box did not return a download URL for this file');
  }
  return data.download_url as string;
}

async function downloadBoxFile(
  fileId: string,
  fileName: string,
  token: string,
  directUrl?: string,
): Promise<File> {
  // Use the pre-signed download_url (from picker item or fetched from metadata).
  // This avoids the api.box.com → CDN redirect chain that triggers 403/CORS.
  const url = directUrl ?? await getBoxDownloadUrl(fileId, token);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Could not download "${fileName}" (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type });
}

// ── Overlay ───────────────────────────────────────────────────────────────────

function createOverlay(): { overlay: HTMLDivElement; container: HTMLDivElement } {
  const overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:9999',
    'background:rgba(0,0,0,0.55)',
    'display:flex', 'align-items:center', 'justify-content:center',
  ].join(';');

  const container = document.createElement('div');
  container.style.cssText = [
    'width:920px', 'max-width:95vw',
    'height:600px', 'max-height:90vh',
    'background:white', 'border-radius:10px',
    'overflow:hidden',
    'box-shadow:0 24px 64px rgba(0,0,0,0.3)',
  ].join(';');

  overlay.appendChild(container);
  document.body.appendChild(overlay);
  return { overlay, container };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Opens the Box Content Picker in a full-page overlay.
 * Authenticates via OAuth 2.0 PKCE (no server / client secret required).
 *
 * Prerequisites:
 *   - Box app created at developer.box.com with OAuth 2.0 + User Authentication
 *   - Redirect URI `http://localhost:4200/box-auth.html` registered in app settings
 *   - BOX_CLIENT_ID set in environment.ts
 */
export async function openBoxPicker(
  clientId: string,
  clientSecret: string,
  allowedExtensions: string[],
): Promise<File[]> {
  await loadBoxSdk();
  const token = await getBoxAccessToken(clientId, clientSecret);

  return new Promise((resolve, reject) => {
    const { overlay, container } = createOverlay();

    const cleanup = () => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    };

    // Dismiss on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve([]);
      }
    });

    const picker = new Box.ContentPicker();

    picker.addListener('choose', async (items: Array<{ id: string; name: string; download_url?: string }>) => {
      cleanup();
      try {
        const files = await Promise.all(
          items.map((item) => downloadBoxFile(item.id, item.name, token, item.download_url)),
        );
        resolve(files);
      } catch (err) {
        reject(err);
      }
    });

    picker.addListener('cancel', () => {
      cleanup();
      resolve([]);
    });

    // '0' = root "All Files" folder
    picker.show('0', token, {
      container,
      maxSelectable: 10,
      extensions: allowedExtensions,
      canUpload: false,
      canCreateNewFolder: false,
    });
  });
}
