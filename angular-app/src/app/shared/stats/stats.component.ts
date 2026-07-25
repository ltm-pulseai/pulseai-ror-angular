import { Component, input } from '@angular/core';
import { User } from '../../core/models/user.model';

/**
 * Following/followers counts + links, per specs/03-microposts.md section 4.
 * The counts themselves come from the User payload (already fetched by
 * whichever page embeds this); the follow/unfollow *action* is Relationships
 * (Phase 4, not built yet) — this component only displays, doesn't mutate.
 */
@Component({
  selector: 'app-stats',
  standalone: true,
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.scss',
})
export class StatsComponent {
  readonly user = input.required<User>();
}
