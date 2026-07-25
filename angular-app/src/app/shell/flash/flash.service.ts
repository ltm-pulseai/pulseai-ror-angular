import { Injectable, signal } from '@angular/core';

export type FlashType = 'success' | 'info' | 'warning' | 'danger';

export interface FlashMessage {
  id: number;
  type: FlashType;
  text: string;
}

/**
 * Angular equivalent of Rails' flash hash (application.html.erb: flash.each
 * -> alert alert-<type>). Decided in specs/01-static-pages.md Open Question 5:
 * owned by the shell, not by any one feature.
 */
@Injectable({ providedIn: 'root' })
export class FlashService {
  private nextId = 0;
  readonly messages = signal<FlashMessage[]>([]);

  show(type: FlashType, text: string): void {
    const id = this.nextId++;
    this.messages.update((msgs) => [...msgs, { id, type, text }]);
  }

  dismiss(id: number): void {
    this.messages.update((msgs) => msgs.filter((m) => m.id !== id));
  }
}
