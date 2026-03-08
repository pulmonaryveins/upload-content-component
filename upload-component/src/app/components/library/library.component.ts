import {
  Component,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LibraryService } from '../../services/library.service';
import { LibraryItem } from '../../types/library.types';
import { ViewMode } from '../../types/upload.types';
import { formatBytes } from '../../utils/format.utils';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss'],
  encapsulation: ViewEncapsulation.Emulated,
})
export class LibraryComponent {
  readonly libraryService = inject(LibraryService);

  readonly items = this.libraryService.items;
  readonly viewMode = this.libraryService.viewMode;

  formatBytes = formatBytes;

  setViewMode(mode: ViewMode): void {
    this.libraryService.setViewMode(mode);
  }

  isImage(item: LibraryItem): boolean {
    return item.type === 'image';
  }

  trackById(_: number, item: LibraryItem): string {
    return item.id;
  }
}
