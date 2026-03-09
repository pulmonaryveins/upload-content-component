import { UploadFile } from '../types/upload.types';
import {
  ALLOWED_MIME_TYPES,
  DANGEROUS_EXTENSIONS,
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
  // Normalize MIME type to lowercase for case-insensitive validation (Row 4)
  const mimeType = file.type.toLowerCase();

  // Fake / double-extension detection (Row 3)
  // e.g. malware.exe.mp4 → stem = "malware.exe" → stemExt = "exe"
  const { ext: stemExt } = splitFilename(stem);
  if (stemExt && DANGEROUS_EXTENSIONS.includes(stemExt.toLowerCase())) {
    return {
      uploadFile: makeErrorFile(file, stem, ext, mimeType),
      error: `Security warning: "${file.name}" contains a suspicious embedded extension ".${stemExt}". Upload blocked.`,
    };
  }

  // MIME validation — normalized to lowercase (Row 4)
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      uploadFile: makeErrorFile(file, stem, ext, mimeType),
      error: `Unsupported file type "${mimeType || ext}". Only PNG, JPEG, MP4 and WEBM are allowed.`,
    };
  }

  // Length validation (full filename with extension)
  if (file.name.length > MAX_FILENAME_LENGTH) {
    return {
      uploadFile: makeErrorFile(file, stem, ext, mimeType),
      error: `Filename is too long (max ${MAX_FILENAME_LENGTH} characters).`,
    };
  }

  // Special character validation (Row 1): only letters, numbers, underscores, periods allowed
  if (INVALID_FILENAME_REGEX.test(stem)) {
    return {
      uploadFile: makeErrorFile(file, stem, ext, mimeType),
      error: 'File names may only contain letters, numbers, underscores, and periods.',
    };
  }

  const previewUrl = URL.createObjectURL(file);

  const uploadFile: UploadFile = {
    id: generateId(),
    originalName: stem,
    currentName: stem,
    extension: ext,
    mimeType,
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

function makeErrorFile(file: File, stem: string, ext: string, mimeType?: string): UploadFile {
  return {
    id: generateId(),
    originalName: stem,
    currentName: stem,
    extension: ext,
    mimeType: mimeType ?? file.type.toLowerCase(),
    size: file.size,
    file,
    previewUrl: '',
    status: 'error',
    isDuplicate: false,
    isRenaming: false,
    progress: 0,
  };
}
