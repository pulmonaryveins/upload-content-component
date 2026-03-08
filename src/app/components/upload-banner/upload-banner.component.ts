import {
  Component,
  ViewEncapsulation,
  computed,
  input,
  output,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { BannerType, RenameSuggestion } from '../../types/upload.types';

@Component({
  selector: 'app-upload-banner',
  standalone: true,
  imports: [NgClass],
  templateUrl: './upload-banner.component.html',
  styleUrls: ['./upload-banner.component.scss'],
  encapsulation: ViewEncapsulation.Emulated,
})
export class UploadBannerComponent {
  type = input<BannerType>('error');
  message = input('');
  subMessage = input('');
  suggestion = input<RenameSuggestion | undefined>(undefined);
  suggestions = input<RenameSuggestion[]>([]);
  suggestionCount = input(0);

  rename = output<void>();
  accept = output<void>();
  closed = output<void>();

  readonly isSuggestion = computed(() => this.type() === 'suggestion');
  readonly isDuplicate = computed(() => this.type() === 'duplicate');
  readonly isError = computed(() => this.type() === 'error');

  onRename(): void {
    this.rename.emit();
  }

  onAccept(): void {
    this.accept.emit();
  }

  onClose(): void {
    this.closed.emit();
  }

  truncate(str: string, max = 18): string {
    return str.length > max ? str.slice(0, max) + '…' : str;
  }
}
