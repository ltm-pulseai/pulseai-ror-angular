import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { provideRouter, TitleStrategy } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { RailsFullTitleStrategy } from './core/title/rails-full-title.strategy';
import { csrfInterceptor } from './core/http/csrf.interceptor';
import { CsrfService } from './core/http/csrf.service';
import { AuthService } from './core/auth/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([csrfInterceptor])),
    { provide: TitleStrategy, useClass: RailsFullTitleStrategy },
    // Fetch the CSRF token and resolve current_user before the app renders,
    // so HeaderComponent/authGuard never flash a logged-out state on
    // refresh — specs/02-sessions.md Open Question 3. Sequential, not
    // Promise.all: both requests can each mint a fresh Rails session cookie
    // if none exists yet, so firing them concurrently risks the CSRF token
    // being scoped to a session that a second concurrent Set-Cookie then
    // overwrites, producing InvalidAuthenticityToken on the next request.
    provideAppInitializer(async () => {
      const csrf = inject(CsrfService);
      const auth = inject(AuthService);
      await csrf.refresh();
      await auth.fetchMe();
    }),
  ],
};
