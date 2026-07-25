import { Component, inject, signal, output } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MicropostsService, Micropost } from '../microposts.service';
import { FormErrorsComponent } from '../../../shared/form-errors/form-errors.component';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/gif', 'image/png'];

@Component({
  selector: 'app-micropost-form',
  standalone: true,
  imports: [ReactiveFormsModule, FormErrorsComponent],
  templateUrl: './micropost-form.component.html',
  styleUrl: './micropost-form.component.scss',
})
export class MicropostFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly micropostsService = inject(MicropostsService);

  readonly created = output<Micropost>();

  protected readonly submitting = signal(false);
  protected readonly serverErrors = signal<Record<string, string[]> | null>(null);
  protected readonly imageError = signal<string | null>(null);
  private selectedImage: File | null = null;

  protected readonly form = this.fb.nonNullable.group({
    content: ['', [Validators.required, Validators.maxLength(140)]],
  });

  // Mirrors the inline <script> in shared/_micropost_form.html.erb that
  // blocks an oversized/wrong-type file before submit — specs/03-microposts.md §5.
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.imageError.set(null);
    this.selectedImage = null;

    if (!file) {
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      this.imageError.set('Image must be a valid image format (JPEG, GIF, or PNG)');
      input.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      this.imageError.set('Image should be less than 5MB');
      input.value = '';
      return;
    }
    this.selectedImage = file;
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.serverErrors.set(null);
    this.submitting.set(true);
    try {
      const { micropost } = await this.micropostsService.create(
        this.form.getRawValue().content,
        this.selectedImage ?? undefined,
      );
      this.created.emit(micropost);
      this.form.reset();
      this.selectedImage = null;
    } catch (err) {
      const httpError = err as { error?: { errors?: Record<string, string[]> } };
      this.serverErrors.set(httpError?.error?.errors ?? { base: ['Something went wrong'] });
    } finally {
      this.submitting.set(false);
    }
  }
}
