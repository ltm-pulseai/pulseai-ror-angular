import { Component, inject, input, output, signal, effect } from '@angular/core';
import { RelationshipsService, FollowState } from '../relationships.service';
import { User } from '../../../core/models/user.model';

/**
 * Replaces the three ERB partials (_follow.html.erb, _follow_form.html.erb,
 * _unfollow.html.erb) that existed only because Rails' AJAX-partial-swap
 * needs one file per DOM state — specs/04-relationships.md section 4/6.
 * Signal-driven, optimistic update, no DOM string replacement.
 */
@Component({
  selector: 'app-follow-button',
  standalone: true,
  templateUrl: './follow-button.component.html',
  styleUrl: './follow-button.component.scss',
})
export class FollowButtonComponent {
  private readonly relationshipsService = inject(RelationshipsService);

  readonly profileUser = input.required<User>();
  readonly stateChange = output<FollowState>();

  protected readonly isFollowing = signal(false);
  protected readonly submitting = signal(false);
  private relationshipId: number | null = null;

  constructor() {
    effect(() => {
      const user = this.profileUser();
      this.isFollowing.set(user.isFollowedByCurrentUser);
      this.relationshipId = user.relationshipId ?? null;
    });
  }

  async toggle(): Promise<void> {
    if (this.submitting()) {
      return; // guards the double-click race the Rails version never guarded (spec Open Question 3)
    }
    const wasFollowing = this.isFollowing();
    // Optimistic update first, roll back on failure (spec section 6).
    this.isFollowing.set(!wasFollowing);
    this.submitting.set(true);
    try {
      const state = wasFollowing
        ? await this.relationshipsService.unfollow(this.relationshipId!)
        : await this.relationshipsService.follow(this.profileUser().id);
      this.relationshipId = state.relationshipId;
      this.isFollowing.set(state.isFollowing);
      this.stateChange.emit(state);
    } catch {
      this.isFollowing.set(wasFollowing);
    } finally {
      this.submitting.set(false);
    }
  }
}
