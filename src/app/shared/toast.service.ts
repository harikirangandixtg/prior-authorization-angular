import { Injectable, signal } from '@angular/core';
import { Tone } from '../core/presentation';

export interface Toast {
  id: number;
  tone: Tone;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 1;

  show(message: string, tone: Tone = 'info', ms = 6000): void {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, tone, message }]);
    if (ms > 0) setTimeout(() => this.dismiss(id), ms);
  }

  success(message: string): void { this.show(message, 'success'); }
  error(message: string): void { this.show(message, 'danger', 10000); }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
