/* eslint-disable @typescript-eslint/no-explicit-any */
declare const google: any;
declare const gapi: any;

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

async function loadPickerApi(): Promise<void> {
  await loadScript('gapi-loader', 'https://apis.google.com/js/api.js');
  return new Promise((resolve) => gapi.load('picker', resolve));
}

async function loadGis(): Promise<void> {
  await loadScript('gis-loader', 'https://accounts.google.com/gsi/client');
}

async function requestAccessToken(clientId: string): Promise<string> {
  await loadGis();
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (resp: any) => {
        if (resp.error) {
          reject(new Error(resp.error_description ?? resp.error));
        } else {
          resolve(resp.access_token as string);
        }
      },
    });
    client.requestAccessToken({ prompt: '' });
  });
}

async function downloadDriveFile(
  fileId: string,
  fileName: string,
  mimeType: string,
  token: string,
): Promise<File> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    throw new Error(`Could not download "${fileName}" (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  return new File([blob], fileName, { type: mimeType });
}

/**
 * Opens the Google Drive Picker and returns the selected files as browser File objects.
 * Returns an empty array if the user cancels.
 */
export async function openGoogleDrivePicker(
  apiKey: string,
  clientId: string,
  projectNumber: string,
  allowedMimeTypes: string[],
): Promise<File[]> {
  const [token] = await Promise.all([
    requestAccessToken(clientId),
    loadPickerApi(),
  ]);

  return new Promise((resolve, reject) => {
    let settled = false;

    const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
      .setMimeTypes(allowedMimeTypes.join(','))
      .setSelectFolderEnabled(false);

    const picker = new google.picker.PickerBuilder()
      .setAppId(projectNumber)
      .setOAuthToken(token)
      .setDeveloperKey(apiKey)
      .addView(view)
      .setTitle('Select files to upload')
      .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
      .setCallback(async (data: any) => {
        if (settled) return;

        if (data.action === google.picker.Action.CANCEL) {
          settled = true;
          resolve([]);
        } else if (data.action === google.picker.Action.PICKED) {
          settled = true;
          try {
            const docs: any[] = data.docs ?? [];
            const files = await Promise.all(
              docs.map((d) =>
                downloadDriveFile(d.id, d.name, d.mimeType, token),
              ),
            );
            resolve(files);
          } catch (err) {
            reject(err);
          }
        }
      })
      .build();

    picker.setVisible(true);
  });
}
