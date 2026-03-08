export type UploadStatus =
  | 'pending'
  | 'uploading'
  | 'uploaded'
  | 'error'
  | 'renamed'
  | 'duplicate';

export type ViewMode = 'grid' | 'list';

export interface UploadFile {
  id: string;
  /** Original stem (no extension), used for duplicate tracking */
  originalName: string;
  /** Current stem — may differ after rename */
  currentName: string;
  extension: string;
  mimeType: string;
  size: number;
  file: File;
  /** Object URL for preview — revoke on cleanup */
  previewUrl: string;
  status: UploadStatus;
  isDuplicate: boolean;
  /** Validation error shown on the card (not rename error) */
  validationError?: string;
  /** Inline rename field error */
  renameError?: string;
  isRenaming: boolean;
  progress: number;
}

export interface UploadEvent {
  status: 'uploading' | 'uploaded';
  file: UploadFile;
  progress?: number;
  result?: unknown;
}

export interface RenameSuggestion {
  fileId: string;
  from: string;
  to: string;
}

export type BannerType = 'error' | 'duplicate' | 'suggestion';

export interface Banner {
  type: BannerType;
  message: string;
  suggestion?: RenameSuggestion;
}
