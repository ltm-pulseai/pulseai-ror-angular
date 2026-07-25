import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../../core/models/user.model';

@Injectable({ providedIn: 'root' })
export class PasswordResetsService {
  private readonly http = inject(HttpClient);

  requestReset(email: string): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.post<{ message: string }>(`${environment.apiBaseUrl}/password_resets`, {
        password_reset: { email },
      }),
    );
  }

  checkToken(token: string, email: string): Promise<{ email: string }> {
    return firstValueFrom(
      this.http.get<{ email: string }>(`${environment.apiBaseUrl}/password_resets/${token}/edit`, {
        params: { email },
      }),
    );
  }

  reset(
    token: string,
    email: string,
    password: string,
    passwordConfirmation: string,
  ): Promise<{ user: User }> {
    return firstValueFrom(
      this.http.patch<{ user: User }>(`${environment.apiBaseUrl}/password_resets/${token}`, {
        email,
        user: { password, password_confirmation: passwordConfirmation },
      }),
    );
  }
}
