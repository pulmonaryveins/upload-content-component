import {
  Component,
  ViewEncapsulation,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UploadFile } from '../../types/upload.types';
import { formatBytes, getMediaLabel } from '../../utils/file.utils';
import { validateFilename } from '../../utils/rename.utils';

@Component({
  selector: 'app-file-card',
  standalone: true,
  imports: [NgClass, FormsModule],
  templateUrl: './file-card.component.html',
  styleUrls: ['./file-card.component.scss'],
  encapsulation: ViewEncapsulation.Emulated,
})
export class FileCardComponent {
  file = input.required<UploadFile>();

  remove = output<string>();
  startRename = output<string>();
  saveRename = output<{ id: string; name: string }>();
  cancelRename = output<string>();

  readonly renameValue = signal('');
  readonly renameError = signal('');
  readonly showActions = signal(false);

  readonly isImage = computed(() => this.file().mimeType.startsWith('image/'));
  readonly isVideo = computed(() => this.file().mimeType.startsWith('video/'));
  readonly mediaLabel = computed(() => getMediaLabel(this.file().mimeType));
  readonly formattedSize = computed(() => formatBytes(this.file().size));
  readonly cardClasses = computed(() => ({
    'file-card--duplicate': this.file().isDuplicate,
    'file-card--renamed': this.file().status === 'renamed',
    'file-card--uploading': this.file().status === 'uploading',
    'file-card--uploaded': this.file().status === 'uploaded',
    'file-card--error': this.file().status === 'error',
  }));

  toggleActions(): void {
    this.showActions.update(v => !v);
  }

  onStartRename(): void {
    this.renameValue.set(this.file().currentName);
    this.renameError.set('');
    this.startRename.emit(this.file().id);
  }

  onSaveRename(): void {
    const error = validateFilename(this.renameValue());
    if (error) {
      this.renameError.set(error);
      return;
    }
    this.renameError.set('');
    this.saveRename.emit({ id: this.file().id, name: this.renameValue() });
  }

  onCancelRename(): void {
    this.renameError.set('');
    this.cancelRename.emit(this.file().id);
  }

  onRemove(): void {
    this.remove.emit(this.file().id);
  }

  onRenameKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.onSaveRename();
    if (event.key === 'Escape') this.onCancelRename();
  }
}
