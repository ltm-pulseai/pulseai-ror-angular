import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FollowState {
  viewedUserId: number;
  isFollowing: boolean;
  relationshipId: number | null;
  followersCount: number;
  followingCount: number;
}

@Injectable({ providedIn: 'root' })
export class RelationshipsService {
  private readonly http = inject(HttpClient);

  follow(followedId: number): Promise<FollowState> {
    return firstValueFrom(
      this.http.post<FollowState>(`${environment.apiBaseUrl}/relationships`, {
        followed_id: followedId,
      }),
    );
  }

  unfollow(relationshipId: number): Promise<FollowState> {
    return firstValueFrom(
      this.http.delete<FollowState>(`${environment.apiBaseUrl}/relationships/${relationshipId}`),
    );
  }
}
