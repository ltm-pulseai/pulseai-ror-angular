import { Component, input } from '@angular/core';

@Component({
  selector: 'app-form-errors',
  standalone: true,
  template: `
    @if (errors() && objectKeys(errors()!).length > 0) {
      <div id="error_explanation">
        <div class="alert alert-danger">
          {{ objectKeys(errors()!).length }} error(s) prohibited this form from being saved:
        </div>
        <ul class="error-list">
          @for (field of objectKeys(errors()!); track field) {
            @for (message of errors()![field]; track message) {
              <li>{{ field }} {{ message }}</li>
            }
          }
        </ul>
      </div>
    }
  `,
})
export class FormErrorsComponent {
  readonly errors = input<Record<string, string[]> | null>(null);
  protected readonly objectKeys = Object.keys;
}
