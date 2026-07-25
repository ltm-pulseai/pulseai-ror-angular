import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UsersService } from '../users.service';
import { AuthService } from '../../../core/auth/auth.service';
import { FormErrorsComponent } from '../../../shared/form-errors/form-errors.component';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [ReactiveFormsModule, FormErrorsComponent],
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.scss',
})
export class EditComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UsersService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private userId!: number;
  protected readonly submitting = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly serverErrors = signal<Record<string, string[]> | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.maxLength(255), Validators.email]],
    password: [''],
    password_confirmation: [''],
  });

  async ngOnInit(): Promise<void> {
    this.userId = Number(this.route.snapshot.paramMap.get('id'));
    // Angular-side mirror of UsersController#correct_user — the Rails
    // before_action already enforces this server-side; this just avoids a
    // pointless round trip when we already know it will be rejected.
    if (this.auth.currentUser()?.id !== this.userId) {
      this.router.navigateByUrl('/');
      return;
    }
    const { user } = await this.usersService.show(this.userId);
    this.form.patchValue({ name: user.name, email: user.email ?? '' });
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.serverErrors.set(null);
    this.submitting.set(true);
    const raw = this.form.getRawValue();
    // has_secure_password treats a blank password as "leave unchanged" —
    // omit it entirely rather than sending empty strings (specs/02-users.md §5).
    const payload = raw.password ? raw : { name: raw.name, email: raw.email };
    try {
      await this.usersService.update(this.userId, payload);
      this.successMessage.set('Profile updated');
    } catch (err) {
      const httpError = err as { error?: { errors?: Record<string, string[]> } };
      this.serverErrors.set(httpError?.error?.errors ?? { base: ['Something went wrong'] });
    } finally {
      this.submitting.set(false);
    }
  }
}
