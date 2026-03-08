import { Injectable, signal, computed, inject } from '@angular/core';
import { Subject } from 'rxjs';
import Uppy from '@uppy/core';
import Transloadit from '@uppy/transloadit';
import { UploadFile, UploadEvent, RenameSuggestion } from '../types/upload.types';
import { LibraryItem } from '../types/library.types';
import { buildUploadFile } from '../utils/file.utils';
import { suggestRename } from '../utils/rename.utils';
import { LibraryService } from './library.service';
import { IMAGE_MIME_TYPES } from '../constants/upload.constants';
import { TRANSLOADIT_KEY, TRANSLOADIT_TEMPLATE_ID } from '../constants/transloadit.constants';

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly libraryService = inject(LibraryService);

  private readonly _files = signal<UploadFile[]>([]);
  private readonly _errorMessages = signal<string[]>([]);

  readonly files = this._files.asReadonly();
  readonly errorMessages = this._errorMessages.asReadonly();

  /** Emits upload progress and completion events */
  readonly uploadEvents$ = new Subject<UploadEvent>();

  // ── Derived state ──────────────────────────────────────────────────────────

  readonly duplicateFiles = computed(() =>
    this._files().filter((f) => f.isDuplicate),
  );

  readonly hasDuplicates = computed(() => this.duplicateFiles().length > 0);

  readonly hasErrors = computed(() =>
    this._files().some((f) => f.status === 'error') ||
    this._errorMessages().length > 0,
  );

  readonly suggestions = computed<RenameSuggestion[]>(() => {
    const allCurrentNames = this._allCurrentNames();
    return this._files()
      .filter((f) => f.isDuplicate)
      .map((f) => {
        const others = allCurrentNames.filter(
          (n) => n.id !== f.id && n.ext === f.extension,
        );
        const suggested = suggestRename(
          f.currentName,
          others.map((o) => o.name),
        );
        return { fileId: f.id, from: f.currentName, to: suggested };
      });
  });

  readonly canUpload = computed(
    () =>
      this._files().length > 0 &&
      !this.hasDuplicates() &&
      !this.hasErrors() &&
      this._files().every((f) => f.status !== 'error'),
  );

  readonly uploadableCount = computed(
    () => this._files().filter((f) => f.status !== 'error').length,
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  addFiles(fileList: File[]): void {
    const newErrors: string[] = [];
    const newFiles: UploadFile[] = [];

    for (const file of fileList) {
      const { uploadFile, error } = buildUploadFile(file);
      if (error) {
        newErrors.push(error);
        continue;
      }
      newFiles.push(uploadFile);
    }

    this._errorMessages.update((errs) => [...errs, ...newErrors]);
    const merged = [...this._files(), ...newFiles];
    this._files.set(merged);
    this._recheckDuplicates();
  }

  removeFile(id: string): void {
    const file = this._files().find((f) => f.id === id);
    if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);

    this._files.update((files) => files.filter((f) => f.id !== id));
    this._recheckDuplicates();
  }

  startRename(id: string): void {
    this._files.update((files) =>
      files.map((f) => (f.id === id ? { ...f, isRenaming: true, renameError: undefined } : f)),
    );
  }

  saveRename(id: string, newName: string): void {
    this._files.update((files) =>
      files.map((f) => {
        if (f.id !== id) return f;
        const status = f.status === 'duplicate' || f.isDuplicate ? 'renamed' : f.status;
        return {
          ...f,
          currentName: newName,
          isRenaming: false,
          renameError: undefined,
          status: status === 'pending' ? 'renamed' : status,
        };
      }),
    );
    this._recheckDuplicates();
  }

  cancelRename(id: string): void {
    this._files.update((files) =>
      files.map((f) => (f.id === id ? { ...f, isRenaming: false, renameError: undefined } : f)),
    );
  }

  setRenameError(id: string, error: string): void {
    this._files.update((files) =>
      files.map((f) => (f.id === id ? { ...f, renameError: error } : f)),
    );
  }

  acceptSuggestion(fileId: string): void {
    const suggestion = this.suggestions().find((s) => s.fileId === fileId);
    if (!suggestion) return;
    this.saveRename(fileId, suggestion.to);
  }

  acceptAllSuggestions(): void {
    for (const suggestion of this.suggestions()) {
      this.saveRename(suggestion.fileId, suggestion.to);
    }
  }

  clearErrors(): void {
    this._errorMessages.set([]);
  }

  reset(): void {
    this._files().forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    this._files.set([]);
    this._errorMessages.set([]);
  }

  startUpload(): void {
    const filesToUpload = this._files().filter((f) => f.status !== 'error');
    if (filesToUpload.length === 0) return;

    const uppy = new Uppy({ autoProceed: false });

    uppy.use(Transloadit, {
      assemblyOptions: {
        params: {
          auth: {
            key: TRANSLOADIT_KEY,
            // Unsigned client-side requests require an expiry timestamp
            expires: this._transloaditExpiry(),
          },
          template_id: TRANSLOADIT_TEMPLATE_ID,
        },
      },
      waitForEncoding: true,
    });

    // Track progress per-file
    uppy.on('upload-progress', (file, progress) => {
      const percentage = progress.bytesTotal
        ? Math.round((progress.bytesUploaded / progress.bytesTotal) * 100)
        : 0;

      const uploadFile = filesToUpload.find((f) => f.file.name === file?.name);
      if (!uploadFile) return;

      this._files.update((files) =>
        files.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: 'uploading', progress: percentage }
            : f,
        ),
      );

      this.uploadEvents$.next({
        status: 'uploading',
        file: { ...uploadFile, progress: percentage },
        progress: percentage,
      });
    });

    uppy.on('upload-success', (file, response) => {
      const uploadFile = filesToUpload.find((f) => f.file.name === file?.name);
      if (!uploadFile) return;

      this._files.update((files) =>
        files.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: 'uploaded', progress: 100 }
            : f,
        ),
      );

      // Resolve the best available URL: Transloadit CDN result > local blob preview
      const assemblyResult = (response.body as Record<string, unknown>) ?? {};
      const resultUrl = this._resolveResultUrl(assemblyResult, uploadFile) ?? uploadFile.previewUrl;

      const completedFile = { ...uploadFile, status: 'uploaded' as const, progress: 100 };

      this.uploadEvents$.next({
        status: 'uploaded',
        file: completedFile,
        result: assemblyResult,
      });

      const libraryItem: LibraryItem = {
        id: uploadFile.id,
        filename: `${uploadFile.currentName}.${uploadFile.extension}`,
        name: uploadFile.currentName,
        extension: uploadFile.extension,
        mimeType: uploadFile.mimeType,
        size: uploadFile.size,
        type: IMAGE_MIME_TYPES.includes(uploadFile.mimeType) ? 'image' : 'video',
        url: resultUrl,
        uploadedAt: new Date(),
      };
      this.libraryService.addItems([libraryItem]);
    });

    uppy.on('upload-error', (_file, error) => {
      console.error('Upload error:', error);
    });

    // Add files to Uppy
    for (const uploadFile of filesToUpload) {
      uppy.addFile({
        name: `${uploadFile.currentName}.${uploadFile.extension}`,
        type: uploadFile.mimeType,
        data: uploadFile.file,
      });
    }

    uppy.upload();
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Extracts the CDN URL from a Transloadit assembly result body.
   * Falls back to the local blob preview URL if no result is found.
   * Prefers store_images / store_videos / store_thumbnails steps in that order.
   */
  /** Returns an expiry string 3 hours from now in Transloadit's required format: YYYY/MM/DD HH:MM:SS+00:00 */
  private _transloaditExpiry(): string {
    const d = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+00:00`;
  }

  private _resolveResultUrl(
    body: Record<string, unknown>,
    uploadFile: UploadFile,
  ): string | null {
    const results = body['results'] as Record<string, Array<{ ssl_url?: string; url?: string }>> | undefined;
    if (!results) return null;

    const preferredSteps = IMAGE_MIME_TYPES.includes(uploadFile.mimeType)
      ? ['store_images', 'resize_image', 'optimize_image']
      : ['store_videos', 'encode_video', 'store_thumbnails'];

    for (const step of preferredSteps) {
      const stepResults = results[step];
      if (stepResults?.length) {
        return stepResults[0].ssl_url ?? stepResults[0].url ?? null;
      }
    }

    // Last resort: first result from any step
    const firstStep = Object.values(results).find((r) => r?.length);
    return firstStep?.[0]?.ssl_url ?? firstStep?.[0]?.url ?? null;
  }

  private _allCurrentNames(): Array<{ id: string; name: string; ext: string }> {
    return this._files().map((f) => ({
      id: f.id,
      name: f.currentName.toLowerCase(),
      ext: f.extension.toLowerCase(),
    }));
  }

  private _recheckDuplicates(): void {
    const libraryPairs = this.libraryService.getExistingNameExtPairs();
    const currentFiles = this._files();

    this._files.update((files) =>
      files.map((file) => {
        const nameLower = file.currentName.toLowerCase();
        const extLower = file.extension.toLowerCase();

        // Check against library
        const libDuplicate = libraryPairs.some(
          (p) => p.name === nameLower && p.ext === extLower,
        );

        // Check against other files in same batch (same name+ext, different id)
        const batchDuplicate = currentFiles.some(
          (other) =>
            other.id !== file.id &&
            other.currentName.toLowerCase() === nameLower &&
            other.extension.toLowerCase() === extLower,
        );

        const isDuplicate = libDuplicate || batchDuplicate;

        return {
          ...file,
          isDuplicate,
          status: isDuplicate
            ? 'duplicate'
            : file.status === 'duplicate'
              ? 'pending'
              : file.status,
        };
      }),
    );
  }
}
