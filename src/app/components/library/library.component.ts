import {
  Component,
  ViewEncapsulation,
  inject,
  computed,
  signal,
  output,
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

  // ── Outputs ────────────────────────────────────────────────────────────────
  upload = output<void>();

  // ── UI state ───────────────────────────────────────────────────────────────
  readonly searchQuery = signal('');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');
  readonly isBulkSelectMode = signal(false);
  readonly selectedIds = signal<string[]>([]);
  readonly pageSize = signal(36);
  readonly failedMediaIds = signal<Set<string>>(new Set());

  // ── Derived stats ──────────────────────────────────────────────────────────
  readonly totalCount = computed(() => this.items().length);
  readonly videoCount = computed(() => this.libraryService.videoItems().length);
  readonly imageCount = computed(() => this.libraryService.imageItems().length);

  readonly filteredItems = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    let result = q
      ? this.items().filter(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            i.filename.toLowerCase().includes(q),
        )
      : [...this.items()];
    result.sort((a, b) =>
      this.sortDirection() === 'desc'
        ? b.uploadedAt.getTime() - a.uploadedAt.getTime()
        : a.uploadedAt.getTime() - b.uploadedAt.getTime(),
    );
    return result;
  });

  readonly pagedItems = computed(() =>
    this.filteredItems().slice(0, this.pageSize()),
  );

  readonly canShowMore = computed(
    () => this.pagedItems().length < this.filteredItems().length,
  );

  // ── Methods ────────────────────────────────────────────────────────────────
  setViewMode(mode: ViewMode): void {
    this.libraryService.setViewMode(mode);
  }

  isImage(item: LibraryItem): boolean {
    return item.type === 'image';
  }

  isMediaFailed(id: string): boolean {
    return this.failedMediaIds().has(id);
  }

  onMediaError(id: string): void {
    this.failedMediaIds.update((s) => new Set([...s, id]));
  }

  onUploadClick(): void {
    this.upload.emit();
  }

  toggleSort(): void {
    this.sortDirection.update((d) => (d === 'desc' ? 'asc' : 'desc'));
  }

  toggleBulkSelect(): void {
    this.isBulkSelectMode.update((v) => !v);
    if (!this.isBulkSelectMode()) {
      this.selectedIds.set([]);
    }
  }

  toggleSelect(id: string): void {
    this.selectedIds.update((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id],
    );
  }

  isSelected(id: string): boolean {
    return this.selectedIds().includes(id);
  }

  showMore(): void {
    this.pageSize.update((n) => n + 36);
  }

  deleteSelected(): void {
    this.selectedIds.set([]);
    this.isBulkSelectMode.set(false);
  }
}
