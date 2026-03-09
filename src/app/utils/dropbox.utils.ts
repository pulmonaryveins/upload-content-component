/* eslint-disable @typescript-eslint/no-explicit-any */
declare const Dropbox: any;

const CHOOSER_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

async function loadDropboxChooserSdk(appKey: string): Promise<void> {
  if (document.getElementById('dropbox-chooser-sdk')) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.id = 'dropbox-chooser-sdk';
    // data-app-key MUST be set before src so the SDK reads it at initialisation time
    script.setAttribute('data-app-key', appKey);
    script.src = 'https://www.dropbox.com/static/api/2/dropins.js';
    // Do NOT set async — the Dropbox SDK reads data-app-key synchronously at parse time
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Dropbox Chooser SDK'));
    document.head.appendChild(script);
  });
}

async function downloadDropboxFile(url: string, fileName: string): Promise<File> {
  const params = new URLSearchParams({ url });
  const res = await fetch(`/api/dropbox/download?${params}`);
  if (!res.ok) {
    throw new Error(`Could not download "${fileName}" (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type });
}

/**
 * Opens the Dropbox Chooser and returns the selected files as browser File objects.
 * Returns an empty array if the user cancels or closes the picker.
 */
export async function openDropboxChooser(
  appKey: string,
  allowedExtensions: string[],
): Promise<File[]> {
  await loadDropboxChooserSdk(appKey);

  // Set the app key directly on the global object — the dynamically-injected
  // script tag's data-app-key attribute may not be read reliably by the SDK.
  Dropbox.appKey = appKey;

  return new Promise((resolve, reject) => {
    let settled = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    // Safety net: if the SDK silently swallows errors (e.g. COOP blocking
    // window.closed polling) neither callback fires — resolve with empty array
    // so the loading state always clears.
    const timer = setTimeout(
      () => settle(() => resolve([])),
      CHOOSER_TIMEOUT_MS,
    );

    try {
      Dropbox.choose({
        success: async (files: Array<{ link: string; name: string }>) => {
          clearTimeout(timer);
          settle(async () => {
            try {
              const downloaded = await Promise.all(
                files.map((f) => downloadDropboxFile(f.link, f.name)),
              );
              resolve(downloaded);
            } catch (err) {
              reject(err);
            }
          });
        },
        cancel: () => {
          clearTimeout(timer);
          settle(() => resolve([]));
        },
        linkType: 'direct',
        multiselect: true,
        extensions: allowedExtensions,
        folderselect: false,
      });
    } catch (err) {
      clearTimeout(timer);
      settle(() => reject(err));
    }
  });
}
