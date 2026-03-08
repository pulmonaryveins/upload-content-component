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
import { FormsModule } from '@angular/forms';

import { UploadService } from '../../services/upload.service';
import { UploadEvent, ViewMode } from '../../types/upload.types';
import { validateFilename } from '../../utils/rename.utils';
import { DropzoneComponent } from '../dropzone/dropzone.component';
import { UploadBannerComponent } from '../upload-banner/upload-banner.component';
import { FileCardComponent } from '../file-card/file-card.component';
import { FileListItemComponent } from '../file-list-item/file-list-item.component';

@Component({
  selector: 'app-upload-modal',
  standalone: true,
  imports: [
    FormsModule,
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

  // â”€â”€ Derived from service â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  readonly files = this.uploadService.files;
  readonly errorMessages = this.uploadService.errorMessages;
  readonly hasDuplicates = this.uploadService.hasDuplicates;
  readonly hasErrors = this.uploadService.hasErrors;
  readonly suggestions = this.uploadService.suggestions;
  readonly canUpload = this.uploadService.canUpload;
  readonly uploadableCount = this.uploadService.uploadableCount;

  readonly duplicateCount = computed(() => this.uploadService.duplicateFiles().length);
  readonly isUploading = computed(() => this.files().some((f) => f.status === 'uploading'));

  readonly footerButtonLabel = computed(() => {
    if (this.files().length === 0) return 'Select files to upload';
    if (this.hasDuplicates()) {
      const n = this.duplicateCount();
      return `Rename ${n} ${n === 1 ? 'file' : 'files'} first`;
    }
    if (this.hasErrors()) return 'Fix errors first';
    return `Upload (${this.uploadableCount()}) Content`;
  });

  readonly footerButtonDisabled = computed(() => !this.canUpload() || this.isUploading());

  // â”€â”€ Rename panel state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  readonly activeRenameFile = computed(() => this.files().find((f) => f.isRenaming) ?? null);
  readonly renameInputValue = signal('');
  readonly renameInputError = signal('');
  // â”€â”€ Success state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ File actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  onFilesDropped(files: File[]): void {
    this.uploadService.addFiles(files);
  }

  onRemoveFile(id: string): void {
    this.uploadService.removeFile(id);
  }

  // â”€â”€ Rename actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  onStartRename(id: string): void {
    this.uploadService.startRename(id);
    if (this.viewMode() === 'grid') {
      const file = this.files().find((f) => f.id === id);
      this.renameInputValue.set(file?.currentName ?? '');
      this.renameInputError.set('');
      this._scrollToRenamePanel();
    }
  }

  onRenameSuggestion(fileId: string): void {
    const suggestion = this.suggestions().find((s) => s.fileId === fileId);
    const file = this.files().find((f) => f.id === fileId);
    this.renameInputValue.set(suggestion?.to ?? file?.currentName ?? '');
    this.renameInputError.set('');
    this.uploadService.startRename(fileId);
    this._scrollToRenamePanel();
  }

  onSaveRenamePanel(): void {
    const file = this.activeRenameFile();
    if (!file) return;
    const error = validateFilename(this.renameInputValue());
    if (error) {
      this.renameInputError.set(error);
      return;
    }
    this.renameInputError.set('');
    this.uploadService.saveRename(file.id, this.renameInputValue());
  }

  onCancelRenamePanel(): void {
    const file = this.activeRenameFile();
    if (!file) return;
    this.renameInputError.set('');
    this.uploadService.cancelRename(file.id);
  }

  onRenamePanelKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.onSaveRenamePanel();
    if (event.key === 'Escape') this.onCancelRenamePanel();
  }

  // â”€â”€ Suggestion actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  onAcceptSuggestion(fileId: string): void {
    this.uploadService.acceptSuggestion(fileId);
  }

  onAcceptAllSuggestions(): void {
    this.uploadService.acceptAllSuggestions();
  }

  onSaveRenameFromList(event: { id: string; name: string }): void {
    this.uploadService.saveRename(event.id, event.name);
  }

  onCancelRenameFromList(id: string): void {
    this.uploadService.cancelRename(id);
  }

  onClearErrors(): void {
    this.uploadService.clearErrors();
  }

  // â”€â”€ Upload / close â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  onUpload(): void {
    if (!this.canUpload()) return;
    this._uploadStarted.set(true);
    this.uploadService.startUpload();
  }

  onClose(): void {
    this.showSuccess.set(false);
    this._uploadStarted.set(false);
    this.renameInputValue.set('');
    this.renameInputError.set('');
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

  // â”€â”€ Utilities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  truncateName(str: string, max = 22): string {
    return str.length > max ? str.slice(0, max) + 'â€¦' : str;
  }

  private _scrollToRenamePanel(): void {
    setTimeout(() => {
      const el = document.querySelector('.upload-modal__rename-section') as HTMLElement | null;
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      (el?.querySelector('.upload-modal__rename-input') as HTMLInputElement | null)?.focus();
    }, 60);
  }
}