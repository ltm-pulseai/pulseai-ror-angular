import { Component, inject, signal, input, OnInit } from '@angular/core';
import { MicropostsService, Micropost } from '../microposts.service';
import { MicropostItemComponent } from '../item/micropost-item.component';
import { MicropostFormComponent } from '../form/micropost-form.component';

@Component({
  selector: 'app-micropost-feed',
  standalone: true,
  imports: [MicropostItemComponent, MicropostFormComponent],
  templateUrl: './micropost-feed.component.html',
  styleUrl: './micropost-feed.component.scss',
})
export class MicropostFeedComponent implements OnInit {
  private readonly micropostsService = inject(MicropostsService);

  // Whether to render the compose form above the feed — home page shows it,
  // a read-only profile feed (Phase 2 ProfileComponent) doesn't need it yet.
  readonly showForm = input(true);

  protected readonly items = signal<Micropost[]>([]);
  protected readonly loading = signal(true);

  async ngOnInit(): Promise<void> {
    const { feedItems } = await this.micropostsService.feed();
    this.items.set(feedItems);
    this.loading.set(false);
  }

  onCreated(micropost: Micropost): void {
    this.items.update((items) => [micropost, ...items]);
  }

  onDeleted(id: number): void {
    this.items.update((items) => items.filter((item) => item.id !== id));
  }
}
