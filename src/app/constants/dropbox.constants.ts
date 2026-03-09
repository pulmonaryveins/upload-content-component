import { environment } from '../../environments/environment';

export const DROPBOX_APP_KEY = environment.dropbox.appKey;

/** File extensions the Dropbox Chooser should filter to (mirrors ALLOWED_MIME_TYPES) */
export const DROPBOX_ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.mp4', '.webm'];
