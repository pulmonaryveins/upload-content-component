import {
  Component,
  ViewEncapsulation,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { UploadFile } from '../../types/upload.types';
import { formatBytes, getMediaLabel } from '../../utils/file.utils';

@Component({
  selector: 'app-file-list-item',
  standalone: true,
  imports: [NgClass],
  templateUrl: './file-list-item.component.html',
  styleUrls: ['./file-list-item.component.scss'],
  encapsulation: ViewEncapsulation.Emulated,
})
export class FileListItemComponent {
  file = input.required<UploadFile>();

  remove = output<string>();
  startRename = output<string>();
  acceptSuggestion = output<string>();
  saveRename = output<{ id: string; name: string }>();
  cancelRename = output<string>();

  readonly renameValue = signal('');

  readonly isImage = computed(() => this.file().mimeType.startsWith('image/'));
  readonly mediaLabel = computed(() => getMediaLabel(this.file().mimeType));
  readonly formattedSize = computed(() => formatBytes(this.file().size));
  readonly rowClasses = computed(() => ({
    'file-list-item--duplicate': this.file().isDuplicate,
    'file-list-item--renamed': this.file().status === 'renamed',
    'file-list-item--renaming': this.file().isRenaming,
    'file-list-item--uploaded': this.file().status === 'uploaded',
  }));

  constructor() {
    effect(() => {
      if (this.file().isRenaming) {
        this.renameValue.set(this.file().currentName);
      }
    });
  }

  onStartRename(): void {
    this.startRename.emit(this.file().id);
  }

  onAcceptSuggestion(): void {
    this.acceptSuggestion.emit(this.file().id);
  }

  onSaveRename(): void {
    const name = this.renameValue().trim();
    if (name) {
      this.saveRename.emit({ id: this.file().id, name });
    }
  }

  onCancelRename(): void {
    this.cancelRename.emit(this.file().id);
  }

  onRenameKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.onSaveRename();
    if (event.key === 'Escape') this.onCancelRename();
  }

  onRemove(): void {
    this.remove.emit(this.file().id);
  }
}
