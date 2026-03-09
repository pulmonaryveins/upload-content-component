export const ALLOWED_MIME_TYPES: string[] = [
  'image/png',
  'image/jpeg',
  'video/mp4',
  'video/webm',
];

export const ALLOWED_EXTENSIONS: string[] = ['png', 'jpeg', 'jpg', 'mp4', 'webm'];

export const MAX_FILENAME_LENGTH = 254;

/** Chars forbidden in original filenames — allows only letters, numbers, underscores, and periods */
export const INVALID_FILENAME_REGEX = /[^a-zA-Z0-9_.]/;

/** Chars forbidden when manually renaming */
export const RENAME_INVALID_CHAR_REGEX = /[^a-zA-Z0-9_\-]/;

/** Known executable/script extensions used to detect fake double-extension attacks (e.g. malware.exe.mp4) */
export const DANGEROUS_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'sh', 'php', 'js', 'py', 'rb', 'pl',
  'dll', 'com', 'vbs', 'scr', 'jar', 'ps1', 'msi', 'wsf', 'hta',
];

export const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg'];
export const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm'];

export const MAX_FILE_COUNT = 10;
