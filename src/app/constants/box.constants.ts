import { environment } from '../../environments/environment';

export const BOX_CLIENT_ID = environment.box.clientId;
export const BOX_CLIENT_SECRET = environment.box.clientSecret;

/** File extensions Box Content Picker should filter to (mirrors ALLOWED_MIME_TYPES) */
export const BOX_ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'mp4', 'webm'];
