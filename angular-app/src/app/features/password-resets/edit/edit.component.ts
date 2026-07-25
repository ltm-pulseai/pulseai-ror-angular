import { Component, inject, signal, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PasswordResetsService } from '../password-resets.service';
import { AuthService } from '../../../core/auth/auth.service';
import { FormErrorsComponent } from '../../../shared/form-errors/form-errors.component';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmation = control.get('password_confirmation')?.value;
  return password === confirmation ? null : { mismatch: true };
}

@Component({
  selector: 'app-password-reset-edit',
  standalone: true,
  imports: [ReactiveFormsModule, FormErrorsComponent],
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.scss',
})
export class EditComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly passwordResetsService = inject(PasswordResetsService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private token!: string;
  private email!: string;

  protected readonly checking = signal(true);
  protected readonly linkError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly serverErrors = signal<Record<string, string[]> | null>(null);

  protected readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(6)]],
      password_confirmation: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  async ngOnInit(): Promise<void> {
    this.token = this.route.snapshot.paramMap.get('token')!;
    this.email = this.route.snapshot.queryParamMap.get('email') ?? '';
    try {
      await this.passwordResetsService.checkToken(this.token, this.email);
    } catch (err) {
      const httpError = err as { error?: { error?: string } };
      this.linkError.set(httpError?.error?.error ?? 'Invalid password reset link');
    } finally {
      this.checking.set(false);
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.serverErrors.set(null);
    this.submitting.set(true);
    const { password, password_confirmation } = this.form.getRawValue();
    try {
      const { user } = await this.passwordResetsService.reset(
        this.token,
        this.email,
        password,
        password_confirmation,
      );
      this.auth.setCurrentUser(user);
      await this.router.navigate(['/users', user.id]);
    } catch (err) {
      const httpError = err as { error?: { errors?: Record<string, string[]>; error?: string } };
      this.serverErrors.set(
        httpError?.error?.errors ?? { base: [httpError?.error?.error ?? 'Something went wrong'] },
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
