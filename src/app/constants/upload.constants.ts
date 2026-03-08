export const ALLOWED_MIME_TYPES: string[] = [
  'image/png',
  'image/jpeg',
  'video/mp4',
  'video/webm',
];

export const ALLOWED_EXTENSIONS: string[] = ['png', 'jpeg', 'jpg', 'mp4', 'webm'];

export const MAX_FILENAME_LENGTH = 254;

/** Chars forbidden in the original filename (spaces + parentheses) */
export const INVALID_FILENAME_REGEX = /[\s()]/;

/** Chars forbidden when manually renaming */
export const RENAME_INVALID_CHAR_REGEX = /[^a-zA-Z0-9_\-]/;

export const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg'];
export const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm'];

export const MAX_FILE_COUNT = 10;
