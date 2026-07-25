/**
 * Matches ApplicationController#user_json (rails-src) / specs/02-users.md
 * section 3. `email` is only present when the API considers the caller the
 * user themself.
 */
export interface User {
  id: number;
  name: string;
  email?: string;
  admin: boolean;
  activated: boolean;
  createdAt: string;
  gravatarUrl: string;
  micropostsCount: number;
  followingCount: number;
  followersCount: number;
  isFollowedByCurrentUser: boolean;
  /** Present only when viewer != user; the viewer's own relationship row id, if following. */
  relationshipId?: number;
}
