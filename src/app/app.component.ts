import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadModalComponent } from './components/upload-modal/upload-modal.component';
import { LibraryComponent } from './components/library/library.component';
import { UploadEvent } from './types/upload.types';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, UploadModalComponent, LibraryComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  isModalOpen = signal(false);
  uploadLog = signal<UploadEvent[]>([]);

  openModal(): void {
    this.isModalOpen.set(true);
  }

  onModalClosed(): void {
    this.isModalOpen.set(false);
  }

  onUploadEvent(event: UploadEvent): void {
    this.uploadLog.update((log) => [event, ...log]);
    console.log('[Upload Event]', event.status, event.file.currentName, event.progress ?? '');
  }
}
