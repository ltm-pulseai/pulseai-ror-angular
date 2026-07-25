import { Component, inject, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import { UsersService } from '../users.service';
import { FormErrorsComponent } from '../../../shared/form-errors/form-errors.component';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmation = control.get('password_confirmation')?.value;
  return password === confirmation ? null : { mismatch: true };
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule, FormErrorsComponent],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss',
})
export class SignupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UsersService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly serverErrors = signal<Record<string, string[]> | null>(null);

  protected readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.maxLength(255), Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      password_confirmation: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.serverErrors.set(null);
    this.submitting.set(true);
    try {
      const response = await this.usersService.signup(this.form.getRawValue());
      this.successMessage.set(response.message);
      setTimeout(() => this.router.navigateByUrl('/'), 2000);
    } catch (err) {
      const httpError = err as { error?: { errors?: Record<string, string[]> } };
      this.serverErrors.set(httpError?.error?.errors ?? { base: ['Something went wrong'] });
    } finally {
      this.submitting.set(false);
    }
  }
}
