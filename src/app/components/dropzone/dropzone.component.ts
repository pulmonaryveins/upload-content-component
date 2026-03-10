import {
  Component,
  ElementRef,
  Signal,
  ViewEncapsulation,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { openGoogleDrivePicker } from '../../utils/google-drive.utils';
import { openDropboxChooser } from '../../utils/dropbox.utils';
import { GDRIVE_CLIENT_ID, GDRIVE_PROJECT_NUMBER } from '../../constants/google-drive.constants';
import { DROPBOX_APP_KEY, DROPBOX_ALLOWED_EXTENSIONS } from '../../constants/dropbox.constants';
import { ALLOWED_MIME_TYPES } from '../../constants/upload.constants';

export type DropzoneTab = 'computer' | 'providers';

interface CloudProvider {
  id: string;
  label: string;
  sub: string;
  open: () => void;
  loading: Signal<boolean>;
  error: Signal<string>;
}

@Component({
  selector: 'app-dropzone',
  standalone: true,
  imports: [],
  templateUrl: './dropzone.component.html',
  styleUrls: ['./dropzone.component.scss'],
  encapsulation: ViewEncapsulation.Emulated,
})
export class DropzoneComponent {
  filesDropped = output<File[]>();

  readonly fileInputRef = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');
  readonly isDragging = signal(false);
  readonly activeTab = signal<DropzoneTab>('computer');
  readonly isDriveLoading = signal(false);
  readonly driveError = signal('');
  readonly isDropboxLoading = signal(false);
  readonly dropboxError = signal('');

  // ── Provider registry ────────────────────────────────────────────────────
  // To add a new provider: append an entry here and add its @case in the template.
  readonly providers: CloudProvider[] = [
    {
      id: 'drive',
      label: 'Google Drive',
      sub: 'Import from your Drive',
      open: () => this.openDrivePicker(),
      loading: this.isDriveLoading,
      error: this.driveError,
    },
    {
      id: 'dropbox',
      label: 'Dropbox',
      sub: 'Import from your Dropbox',
      open: () => this.openDropboxPicker(),
      loading: this.isDropboxLoading,
      error: this.dropboxError,
    },
  ];

  private _dragCounter = 0;

  setTab(tab: DropzoneTab): void {
    this.activeTab.set(tab);
    this.driveError.set('');
    this.dropboxError.set('');
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this._dragCounter++;
    this.isDragging.set(true);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this._dragCounter--;
    if (this._dragCounter <= 0) {
      this._dragCounter = 0;
      this.isDragging.set(false);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    this._dragCounter = 0;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.filesDropped.emit(Array.from(files));
    }
  }

  openFileBrowser(): void {
    this.fileInputRef().nativeElement.click();
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.filesDropped.emit(Array.from(input.files));
      input.value = '';
    }
  }

  // ── Google Drive ────────────────────────────────────────────────────────

  async openDrivePicker(): Promise<void> {
    this.driveError.set('');
    this.isDriveLoading.set(true);
    try {
      // Fetch the API key from the proxy server so it is never statically bundled
      const configRes = await fetch('/api/google-drive/config');
      if (!configRes.ok) throw new Error('Could not fetch Drive configuration from proxy server');
      const { apiKey } = await configRes.json();

      const files = await openGoogleDrivePicker(
        apiKey,
        GDRIVE_CLIENT_ID,
        GDRIVE_PROJECT_NUMBER,
        ALLOWED_MIME_TYPES,
      );
      if (files.length > 0) {
        this.filesDropped.emit(files);
      }
    } catch (err) {
      this.driveError.set(
        err instanceof Error ? err.message : 'Failed to open Google Drive',
      );
    } finally {
      this.isDriveLoading.set(false);
    }
  }

  // ── Dropbox ──────────────────────────────────────────────────────────────

  async openDropboxPicker(): Promise<void> {
    this.dropboxError.set('');
    this.isDropboxLoading.set(true);
    try {
      const files = await openDropboxChooser(DROPBOX_APP_KEY, DROPBOX_ALLOWED_EXTENSIONS);
      if (files.length > 0) {
        this.filesDropped.emit(files);
      }
    } catch (err) {
      this.dropboxError.set(
        err instanceof Error ? err.message : 'Failed to open Dropbox',
      );
    } finally {
      this.isDropboxLoading.set(false);
    }
  }
}
