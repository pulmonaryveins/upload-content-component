/* eslint-disable @typescript-eslint/no-explicit-any */
declare const FB: any;

import { loadScript } from './script-loader.utils';

// ── SDK bootstrap ─────────────────────────────────────────────────────────────

let _sdkInitialised = false;

async function loadFacebookSdk(appId: string, version: string): Promise<void> {
  await loadScript('facebook-jssdk', 'https://connect.facebook.net/en_US/sdk.js');
  if (!_sdkInitialised) {
    FB.init({ appId, version, xfbml: false, cookie: false });
    _sdkInitialised = true;
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

function fbLogin(scope: string): Promise<void> {
  return new Promise((resolve, reject) => {
    FB.login(
      (response: { authResponse?: { accessToken: string }; status: string }) => {
        if (response.authResponse?.accessToken) {
          resolve();
        } else {
          reject(
            new Error(
              response.status === 'unknown'
                ? 'Login was cancelled'
                : 'Facebook login failed. Check your App ID and permissions.',
            ),
          );
        }
      },
      { scope, return_scopes: true },
    );
  });
}

// ── Graph API ─────────────────────────────────────────────────────────────────

function fbApi<T>(path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    FB.api(path, (res: T & { error?: { message: string } }) => {
      if (!res || (res as any).error) {
        reject(new Error((res as any)?.error?.message ?? `Graph API failed: ${path}`));
      } else {
        resolve(res);
      }
    });
  });
}

// ── Download ──────────────────────────────────────────────────────────────────

async function downloadFacebookFile(url: string, fileName: string): Promise<File> {
  // Facebook CDN URLs are pre-signed; the server proxy fetches them directly
  // without needing an Authorization header (similar to Dropbox direct links).
  const params = new URLSearchParams({ url, name: fileName });
  const res = await fetch(`/api/facebook/download?${params}`);
  if (!res.ok) {
    throw new Error(`Could not download "${fileName}" (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type });
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface FbPhoto {
  id: string;
  name?: string;
  images: Array<{ source: string; width: number; height: number }>;
}

interface FbVideo {
  id: string;
  description?: string;
  source: string;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Opens Facebook Login, then imports the user's 9 most recently uploaded
 * photos and videos as browser File objects.
 *
 * Prerequisites:
 *   - Facebook App created at developers.facebook.com
 *   - FACEBOOK_APP_ID set in environment.ts
 *   - App domain added to "Valid OAuth Redirect URIs" and "App Domains"
 *   - user_photos + user_videos permissions approved (or in development mode)
 *   - /api/facebook/download proxy running on the server
 */
export async function openFacebookPicker(appId: string, version: string): Promise<File[]> {
  await loadFacebookSdk(appId, version);
  await fbLogin('user_photos,user_videos');

  // Fetch recent uploaded photos and videos in parallel
  const [photosRes, videosRes] = await Promise.all([
    fbApi<{ data: FbPhoto[] }>(
      '/me/photos?type=uploaded&fields=id,name,images&limit=9',
    ),
    fbApi<{ data: FbVideo[] }>(
      '/me/videos?type=uploaded&fields=id,description,source&limit=9',
    ),
  ]);

  const photoFiles = await Promise.all(
    (photosRes.data ?? []).map((p, i) => {
      const largest = p.images.reduce((a, b) => (b.width > a.width ? b : a), p.images[0]);
      const name = p.name ? `${p.name}.jpg` : `facebook_photo_${i + 1}.jpg`;
      return downloadFacebookFile(largest.source, name);
    }),
  );

  const videoFiles = await Promise.all(
    (videosRes.data ?? []).map((v, i) => {
      const name = v.description ? `${v.description}.mp4` : `facebook_video_${i + 1}.mp4`;
      return downloadFacebookFile(v.source, name);
    }),
  );

  return [...photoFiles, ...videoFiles].filter((f) => f.size > 0);
}
