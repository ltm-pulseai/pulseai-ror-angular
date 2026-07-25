import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { StatsComponent } from '../../../shared/stats/stats.component';
import { MicropostFeedComponent } from '../../microposts/feed/micropost-feed.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, StatsComponent, MicropostFeedComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  protected readonly auth = inject(AuthService);
}
