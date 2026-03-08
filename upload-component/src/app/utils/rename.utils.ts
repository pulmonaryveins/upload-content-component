import { RENAME_INVALID_CHAR_REGEX } from '../constants/upload.constants';

/**
 * Suggests the lowest available rename for `name` given a set of taken names.
 * Tries name_1, name_2, name_3 ... until one is free.
 * Comparison is case-insensitive.
 */
export function suggestRename(name: string, takenNames: string[]): string {
  const lower = takenNames.map((n) => n.toLowerCase());
  let counter = 1;
  while (lower.includes(`${name.toLowerCase()}_${counter}`)) {
    counter++;
  }
  return `${name}_${counter}`;
}

/**
 * Validates a filename stem (no extension) typed by the user during rename.
 * Returns an error message string or null if valid.
 */
export function validateFilename(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return 'Filename cannot be empty';
  }
  if (RENAME_INVALID_CHAR_REGEX.test(name)) {
    return 'Filename contains invalid characters';
  }
  return null;
}
