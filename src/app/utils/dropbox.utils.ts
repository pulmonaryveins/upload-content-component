/* eslint-disable @typescript-eslint/no-explicit-any */
declare const Dropbox: any;

function loadScript(id: string, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

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
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Could not download "${fileName}" (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type });
}

/**
 * Opens the Dropbox Chooser and returns the selected files as browser File objects.
 * Returns an empty array if the user cancels.
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
    Dropbox.choose({
      success: async (files: Array<{ link: string; name: string }>) => {
        try {
          const downloaded = await Promise.all(
            files.map((f) => downloadDropboxFile(f.link, f.name)),
          );
          resolve(downloaded);
        } catch (err) {
          reject(err);
        }
      },
      cancel: () => {
        resolve([]);
      },
      linkType: 'direct',
      multiselect: true,
      extensions: allowedExtensions,
      folderselect: false,
    });
  });
}
