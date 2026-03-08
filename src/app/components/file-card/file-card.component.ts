import {
  Component,
  ViewEncapsulation,
  computed,
  input,
  output,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { UploadFile } from '../../types/upload.types';
import { formatBytes, getMediaLabel } from '../../utils/file.utils';

@Component({
  selector: 'app-file-card',
  standalone: true,
  imports: [NgClass],
  templateUrl: './file-card.component.html',
  styleUrls: ['./file-card.component.scss'],
  encapsulation: ViewEncapsulation.Emulated,
})
export class FileCardComponent {
  file = input.required<UploadFile>();

  remove = output<string>();
  startRename = output<string>();
  cancelRename = output<string>();

  readonly isImage = computed(() => this.file().mimeType.startsWith('image/'));
  readonly isVideo = computed(() => this.file().mimeType.startsWith('video/'));
  readonly mediaLabel = computed(() => getMediaLabel(this.file().mimeType));
  readonly formattedSize = computed(() => formatBytes(this.file().size));
  readonly cardClasses = computed(() => ({
    'file-card--duplicate': this.file().isDuplicate,
    'file-card--renamed': this.file().status === 'renamed',
    'file-card--renaming': this.file().isRenaming,
    'file-card--uploading': this.file().status === 'uploading',
    'file-card--uploaded': this.file().status === 'uploaded',
    'file-card--error': this.file().status === 'error',
  }));

  onToggleRename(): void {
    if (this.file().isRenaming) {
      this.cancelRename.emit(this.file().id);
    } else {
      this.startRename.emit(this.file().id);
    }
  }

  onRemove(): void {
    this.remove.emit(this.file().id);
  }
}
