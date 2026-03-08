import { environment } from '../../environments/environment';

// API key is fetched at runtime from GET /api/google-drive/config (server/.env).
export const GDRIVE_CLIENT_ID = environment.googleDrive.clientId;
export const GDRIVE_PROJECT_NUMBER = environment.googleDrive.projectNumber;
export const GDRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
