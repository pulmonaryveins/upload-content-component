import { environment } from '../../environments/environment';

export const GDRIVE_API_KEY = environment.googleDrive.apiKey;
export const GDRIVE_CLIENT_ID = environment.googleDrive.clientId;
export const GDRIVE_PROJECT_NUMBER = environment.googleDrive.projectNumber;
export const GDRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
