import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../../core/models/user.model';

export interface ActivationResult {
  activated: boolean;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AccountActivationsService {
  private readonly http = inject(HttpClient);

  activate(token: string, email: string): Promise<ActivationResult> {
    return firstValueFrom(
      this.http.get<ActivationResult>(
        `${environment.apiBaseUrl}/account_activations/${token}/edit`,
        {
          params: { email },
        },
      ),
    );
  }
}
