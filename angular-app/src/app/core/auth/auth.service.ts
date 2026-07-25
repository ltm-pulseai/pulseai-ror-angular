import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';

interface MeResponse {
  user: User | null;
}

interface LoginResponse {
  user: User;
}

/**
 * Cookie + CSRF transport (specs/02-sessions.md Open Question 1, resolved).
 * Rails keeps the encrypted session cookie; csrf.interceptor.ts attaches
 * X-CSRF-Token on this service's POST/DELETE calls.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly currentUser = signal<User | null>(null);

  async login(email: string, password: string, rememberMe: boolean): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>(`${environment.apiBaseUrl}/login`, {
        session: { email, password, remember_me: rememberMe ? '1' : '0' },
      }),
    );
    this.currentUser.set(response.user);
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.delete(`${environment.apiBaseUrl}/logout`));
    this.currentUser.set(null);
  }

  async fetchMe(): Promise<void> {
    const response = await firstValueFrom(
      this.http.get<MeResponse>(`${environment.apiBaseUrl}/me`),
    );
    this.currentUser.set(response.user);
  }

  /**
   * For flows other than login() that also establish a Rails session
   * server-side (password_resets#update calls log_in @user, mirroring a
   * fresh login) — specs/05-password-resets.md section 8.
   */
  setCurrentUser(user: User): void {
    this.currentUser.set(user);
  }
}
