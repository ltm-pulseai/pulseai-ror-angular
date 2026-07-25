import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { UsersService, UserShowResponse } from '../users.service';
import { StatsComponent } from '../../../shared/stats/stats.component';
import { FollowButtonComponent } from '../../relationships/follow-button/follow-button.component';
import { FollowState } from '../../relationships/relationships.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [StatsComponent, DatePipe, FollowButtonComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly usersService = inject(UsersService);
  protected readonly auth = inject(AuthService);

  protected readonly data = signal<UserShowResponse | null>(null);
  protected readonly notFound = signal(false);

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    try {
      this.data.set(await this.usersService.show(id));
    } catch {
      this.notFound.set(true);
    }
  }

  onFollowStateChange(state: FollowState): void {
    this.data.update((current) =>
      current
        ? {
            ...current,
            user: {
              ...current.user,
              isFollowedByCurrentUser: state.isFollowing,
              relationshipId: state.relationshipId ?? undefined,
              followersCount: state.followersCount,
            },
          }
        : current,
    );
  }
}
