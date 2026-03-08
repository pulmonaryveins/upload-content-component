import { Injectable, signal, computed } from '@angular/core';
import { LibraryItem } from '../types/library.types';
import { ViewMode } from '../types/upload.types';

@Injectable({ providedIn: 'root' })
export class LibraryService {
  private readonly _items = signal<LibraryItem[]>([]);
  private readonly _viewMode = signal<ViewMode>('grid');

  readonly items = this._items.asReadonly();
  readonly viewMode = this._viewMode.asReadonly();

  readonly imageItems = computed(() =>
    this._items().filter((i) => i.type === 'image'),
  );
  readonly videoItems = computed(() =>
    this._items().filter((i) => i.type === 'video'),
  );

  addItems(newItems: LibraryItem[]): void {
    this._items.update((current) => [...current, ...newItems]);
  }

  setViewMode(mode: ViewMode): void {
    this._viewMode.set(mode);
  }

  /** Returns all current filenames (lowercase) for duplicate checking */
  getExistingFilenames(): string[] {
    return this._items().map((i) => i.filename.toLowerCase());
  }

  /** Returns all current name+ext pairs for cross-type-aware duplicate checking */
  getExistingNameExtPairs(): Array<{ name: string; ext: string }> {
    return this._items().map((i) => ({
      name: i.name.toLowerCase(),
      ext: i.extension.toLowerCase(),
    }));
  }
}
