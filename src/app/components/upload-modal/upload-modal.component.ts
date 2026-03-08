import {
  Component,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { UploadService } from '../../services/upload.service';
import { UploadEvent, ViewMode } from '../../types/upload.types';
import { DropzoneComponent } from '../dropzone/dropzone.component';
import { UploadBannerComponent } from '../upload-banner/upload-banner.component';
import { FileCardComponent } from '../file-card/file-card.component';
import { FileListItemComponent } from '../file-list-item/file-list-item.component';

@Component({
  selector: 'app-upload-modal',
  standalone: true,
  imports: [
    DropzoneComponent,
    UploadBannerComponent,
    FileCardComponent,
    FileListItemComponent,
  ],
  templateUrl: './upload-modal.component.html',
  styleUrls: ['./upload-modal.component.scss'],
  encapsulation: ViewEncapsulation.Emulated,
})
export class UploadModalComponent {
  isOpen = input(false);
  closed = output<void>();
  uploadEvent = output<UploadEvent>();

  readonly uploadService = inject(UploadService);

  readonly viewMode = signal<ViewMode>('grid');

  // ── Derived from service ───────────────────────────────────────────────────
  readonly files = this.uploadService.files;
  readonly errorMessages = this.uploadService.errorMessages;
  readonly hasDuplicates = this.uploadService.hasDuplicates;
  readonly hasErrors = this.uploadService.hasErrors;
  readonly suggestions = this.uploadService.suggestions;
  readonly canUpload = this.uploadService.canUpload;
  readonly uploadableCount = this.uploadService.uploadableCount;

  readonly duplicateCount = computed(() => this.uploadService.duplicateFiles().length);

  readonly isUploading = computed(() =>
    this.files().some((f) => f.status === 'uploading'),
  );

  readonly footerButtonLabel = computed(() => {
    if (this.files().length === 0) return 'Select files to upload';
    if (this.hasDuplicates()) {
      const n = this.duplicateCount();
      return `Rename ${n} ${n === 1 ? 'duplicate' : 'duplicates'} first`;
    }
    if (this.hasErrors()) return 'Fix errors first';
    return `Upload (${this.uploadableCount()}) Content`;
  });

  readonly footerButtonDisabled = computed(
    () => !this.canUpload() || this.isUploading(),
  );

  readonly showSuccess = signal(false);
  private readonly _uploadStarted = signal(false);

  constructor() {
    this.uploadService.uploadEvents$
      .pipe(takeUntilDestroyed())
      .subscribe((event) => this.uploadEvent.emit(event));

    effect(
      () => {
        if (
          this._uploadStarted() &&
          !this.isUploading() &&
          this.files().length > 0 &&
          this.files().every((f) => f.status === 'uploaded' || f.status === 'error')
        ) {
          this.showSuccess.set(true);
          this._uploadStarted.set(false);
        }
      },
      { allowSignalWrites: true },
    );
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  onFilesDropped(files: File[]): void {
    this.uploadService.addFiles(files);
  }

  onRemoveFile(id: string): void {
    this.uploadService.removeFile(id);
  }

  onStartRename(id: string): void {
    this.uploadService.startRename(id);
  }

  onSaveRename(payload: { id: string; name: string }): void {
    this.uploadService.saveRename(payload.id, payload.name);
  }

  onCancelRename(id: string): void {
    this.uploadService.cancelRename(id);
  }

  onAcceptSuggestion(fileId: string): void {
    this.uploadService.acceptSuggestion(fileId);
  }

  onAcceptAllSuggestions(): void {
    this.uploadService.acceptAllSuggestions();
  }

  onRenameSuggestion(fileId: string): void {
    this.uploadService.startRename(fileId);
  }

  onClearErrors(): void {
    this.uploadService.clearErrors();
  }

  onUpload(): void {
    if (!this.canUpload()) return;
    this._uploadStarted.set(true);
    this.uploadService.startUpload();
  }

  onClose(): void {
    this.showSuccess.set(false);
    this._uploadStarted.set(false);
    this.uploadService.reset();
    this.closed.emit();
  }

  onSuccessContinue(): void {
    this.showSuccess.set(false);
    this.onClose();
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }
}
