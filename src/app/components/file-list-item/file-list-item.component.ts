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
  selector: 'app-file-list-item',
  standalone: true,
  imports: [NgClass, FormsModule],
  templateUrl: './file-list-item.component.html',
  styleUrls: ['./file-list-item.component.scss'],
  encapsulation: ViewEncapsulation.Emulated,
})
export class FileListItemComponent {
  file = input.required<UploadFile>();

  remove = output<string>();
  startRename = output<string>();
  saveRename = output<{ id: string; name: string }>();
  cancelRename = output<string>();

  readonly renameValue = signal('');
  readonly renameError = signal('');

  readonly isImage = computed(() => this.file().mimeType.startsWith('image/'));
  readonly mediaLabel = computed(() => getMediaLabel(this.file().mimeType));
  readonly formattedSize = computed(() => formatBytes(this.file().size));
  readonly rowClasses = computed(() => ({
    'file-list-item--duplicate': this.file().isDuplicate,
    'file-list-item--renamed': this.file().status === 'renamed',
    'file-list-item--uploaded': this.file().status === 'uploaded',
  }));

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
