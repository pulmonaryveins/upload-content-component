export type LibraryItemType = 'image' | 'video';

export interface LibraryItem {
  id: string;
  /** Full filename with extension, e.g. "photo.png" */
  filename: string;
  /** Stem without extension, e.g. "photo" */
  name: string;
  extension: string;
  mimeType: string;
  size: number;
  type: LibraryItemType;
  /** URL to preview the asset (blob URL or remote URL) */
  url: string;
  uploadedAt: Date;
}
