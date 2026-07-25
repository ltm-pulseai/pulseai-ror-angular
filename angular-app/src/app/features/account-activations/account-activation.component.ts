import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountActivationsService } from './account-activations.service';
import { AuthService } from '../../core/auth/auth.service';

/**
 * Thin, redirect-only — mirrors the Rails action, which never renders a
 * view (every path is a redirect). specs/06-account-activations.md section
 * 4/8: on ngOnInit, fire the activation call, show a brief message, then
 * navigate — no persistent view.
 */
@Component({
  selector: 'app-account-activation',
  standalone: true,
  template: `
    @if (checking()) {
      <p>Activating your account...</p>
    } @else if (message()) {
      <div class="alert" [class.alert-success]="success()" [class.alert-danger]="!success()">
        {{ message() }}
      </div>
    }
  `,
})
export class AccountActivationComponent implements OnInit {
  private readonly accountActivationsService = inject(AccountActivationsService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly checking = signal(true);
  protected readonly success = signal(false);
  protected readonly message = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const token = this.route.snapshot.paramMap.get('token')!;
    const email = this.route.snapshot.queryParamMap.get('email') ?? '';
    try {
      const result = await this.accountActivationsService.activate(token, email);
      this.auth.setCurrentUser(result.user); // mirrors Rails' log_in user on success
      this.success.set(true);
      this.message.set('Account activated!');
      this.checking.set(false);
      setTimeout(() => this.router.navigate(['/users', result.user.id]), 1200);
    } catch {
      this.success.set(false);
      this.message.set('Invalid activation link');
      this.checking.set(false);
      setTimeout(() => this.router.navigateByUrl('/'), 1200);
    }
  }
}
