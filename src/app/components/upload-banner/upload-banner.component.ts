import {
  Component,
  OnInit,
  OnDestroy,
  ViewEncapsulation,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { BannerType, RenameSuggestion } from '../../types/upload.types';

const AUTO_DISMISS_MS = 5000;
const EXIT_ANIMATION_MS = 320;

@Component({
  selector: 'app-upload-banner',
  standalone: true,
  imports: [NgClass],
  templateUrl: './upload-banner.component.html',
  styleUrls: ['./upload-banner.component.scss'],
  encapsulation: ViewEncapsulation.Emulated,
})
export class UploadBannerComponent implements OnInit, OnDestroy {
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

  readonly showDetails = signal(false);
  readonly dismissing = signal(false);

  private _autoTimer: ReturnType<typeof setTimeout> | null = null;
  private _exitTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    if (this.type() === 'error') {
      this._autoTimer = setTimeout(() => this._dismiss(), AUTO_DISMISS_MS);
    }
  }

  ngOnDestroy(): void {
    if (this._autoTimer) clearTimeout(this._autoTimer);
    if (this._exitTimer) clearTimeout(this._exitTimer);
  }

  private _dismiss(): void {
    this.dismissing.set(true);
    this._exitTimer = setTimeout(() => this.closed.emit(), EXIT_ANIMATION_MS);
  }

  toggleDetails(): void {
    this.showDetails.update((v) => !v);
  }

  onRename(): void {
    this.rename.emit();
  }

  onAccept(): void {
    this.accept.emit();
  }

  onClose(): void {
    if (this._autoTimer) {
      clearTimeout(this._autoTimer);
      this._autoTimer = null;
    }
    this._dismiss();
  }

  truncate(str: string, max = 18): string {
    return str.length > max ? str.slice(0, max) + '…' : str;
  }
}
