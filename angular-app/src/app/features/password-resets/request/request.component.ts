import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { PasswordResetsService } from '../password-resets.service';

@Component({
  selector: 'app-password-reset-request',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './request.component.html',
  styleUrl: './request.component.scss',
})
export class RequestComponent {
  private readonly fb = inject(FormBuilder);
  private readonly passwordResetsService = inject(PasswordResetsService);

  protected readonly submitting = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.errorMessage.set(null);
    this.submitting.set(true);
    try {
      const { message } = await this.passwordResetsService.requestReset(
        this.form.getRawValue().email,
      );
      this.successMessage.set(message);
    } catch (err) {
      const httpError = err as { error?: { error?: string } };
      this.errorMessage.set(httpError?.error?.error ?? 'Email address not found');
    } finally {
      this.submitting.set(false);
    }
  }
}
