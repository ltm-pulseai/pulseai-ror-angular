import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface CsrfTokenResponse {
  csrfToken: string;
}

/**
 * Holds the Rails CSRF token (GET /api/csrf_token) so csrf.interceptor.ts can
 * attach it as X-CSRF-Token on mutating requests — the cookie+CSRF transport
 * decided in specs/02-sessions.md Open Question 1.
 */
@Injectable({ providedIn: 'root' })
export class CsrfService {
  private readonly http = inject(HttpClient);
  readonly token = signal<string | null>(null);

  async refresh(): Promise<void> {
    const response = await firstValueFrom(
      this.http.get<CsrfTokenResponse>(`${environment.apiBaseUrl}/csrf_token`, {
        withCredentials: true,
      }),
    );
    this.token.set(response.csrfToken);
  }
}
