import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MicropostsService, Micropost } from '../microposts.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-micropost-item',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './micropost-item.component.html',
  styleUrl: './micropost-item.component.scss',
})
export class MicropostItemComponent {
  private readonly micropostsService = inject(MicropostsService);
  protected readonly auth = inject(AuthService);

  readonly micropost = input.required<Micropost>();
  readonly deleted = output<number>();

  async delete(): Promise<void> {
    if (!confirm('You sure?')) {
      return;
    }
    await this.micropostsService.destroy(this.micropost().id);
    this.deleted.emit(this.micropost().id);
  }
}
