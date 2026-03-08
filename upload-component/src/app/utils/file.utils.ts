import { UploadFile } from '../types/upload.types';
import {
  ALLOWED_MIME_TYPES,
  INVALID_FILENAME_REGEX,
  MAX_FILENAME_LENGTH,
  IMAGE_MIME_TYPES,
} from '../constants/upload.constants';
import { formatBytes } from './format.utils';

/**
 * Splits a filename into stem and extension.
 * "photo.png" → { name: "photo", ext: "png" }
 * "archive.tar.gz" → { name: "archive.tar", ext: "gz" }
 */
export function splitFilename(filename: string): { name: string; ext: string } {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return { name: filename, ext: '' };
  return {
    name: filename.substring(0, lastDot),
    ext: filename.substring(lastDot + 1).toLowerCase(),
  };
}

/**
 * Validates a raw File and constructs an UploadFile object.
 * Returns { uploadFile, error } — if error is set the file should NOT be added.
 */
export function buildUploadFile(
  file: File,
): { uploadFile: UploadFile; error?: string } {
  const { name: stem, ext } = splitFilename(file.name);

  // MIME validation
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      uploadFile: makeErrorFile(file, stem, ext),
      error: `Unsupported file type "${file.type || ext}". Only PNG, JPEG, MP4 and WEBM are allowed.`,
    };
  }

  // Length validation (full filename with extension)
  if (file.name.length > MAX_FILENAME_LENGTH) {
    return {
      uploadFile: makeErrorFile(file, stem, ext),
      error: `Filename is too long (max ${MAX_FILENAME_LENGTH} characters).`,
    };
  }

  // Special character validation
  if (INVALID_FILENAME_REGEX.test(stem)) {
    return {
      uploadFile: makeErrorFile(file, stem, ext),
      error: 'File names cannot contain special characters including spaces and parenthesis',
    };
  }

  const previewUrl = URL.createObjectURL(file);

  const uploadFile: UploadFile = {
    id: generateId(),
    originalName: stem,
    currentName: stem,
    extension: ext,
    mimeType: file.type,
    size: file.size,
    file,
    previewUrl,
    status: 'pending',
    isDuplicate: false,
    isRenaming: false,
    progress: 0,
  };

  return { uploadFile };
}

/** Returns a human-readable label like "IMAGE" or "VIDEO" */
export function getMediaLabel(mimeType: string): string {
  return IMAGE_MIME_TYPES.includes(mimeType) ? 'IMAGE' : 'VIDEO';
}

export { formatBytes };

// ─────────────────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function makeErrorFile(file: File, stem: string, ext: string): UploadFile {
  return {
    id: generateId(),
    originalName: stem,
    currentName: stem,
    extension: ext,
    mimeType: file.type,
    size: file.size,
    file,
    previewUrl: '',
    status: 'error',
    isDuplicate: false,
    isRenaming: false,
    progress: 0,
  };
}
