---
name: angular-scaffold
description: One-time creation of the Angular workspace (angular-app/) for the Rails-to-Angular migration — standalone components, signals, stubbed AuthService contract, dev proxy to Rails. Run once at Phase 0 bootstrap; do not re-run after features exist.
---

# angular-scaffold

Creates the target Angular SPA workspace once, before any feature migration
happens. Everything here is scaffolding/contract, not feature code — feature
code is added later by `feature-migrate`, one feature at a time.

## Precondition

Only run this if `angular-app/` does not already exist. If it exists, stop and
tell the user — re-running `ng new` over an existing app is destructive.

## Steps

1. **Generate the workspace** from the repo root (`F:\ai\ror-angular`):
   ```
   npx @angular/cli@latest new angular-app --routing --style=scss --ssr=false --skip-git --package-manager=npm
   ```
   Standalone components are the default for current Angular CLI versions (no
   `--standalone` flag needed, and there is no NgModule to opt out of).

2. **Strict mode**: confirm `tsconfig.json` has `"strict": true` (the CLI default) — do not relax it.

3. **`environment.ts` / `environment.development.ts`** under `angular-app/src/environments/`:
   ```ts
   export const environment = {
     production: false,
     apiBaseUrl: '/api',
   };
   ```
   Rails is reached through the dev proxy (below) at `/api`, not a hardcoded host — this keeps prod config to a single value swap later.

4. **`proxy.conf.json`** at `angular-app/proxy.conf.json`:
   ```json
   {
     "/api": {
       "target": "http://localhost:3001",
       "secure": false,
       "changeOrigin": true
     }
   }
   ```
   Wire it into `angular.json`'s `serve` target (`"proxyConfig": "proxy.conf.json"`) so `ng serve` talks to Rails on port 3001 (Rails' default 3000 is left free for running the still-partially-HTML app during parity checks).

5. **Stub `AuthService` contract** at `angular-app/src/app/core/auth/auth.service.ts` — this exists so `HeaderComponent`/route guards can be built in Phase 1 against a real interface before Phase 2 implements it for real:
   ```ts
   import { Injectable, signal } from '@angular/core';

   export interface CurrentUser {
     id: number;
     name: string;
     email: string;
     admin: boolean;
   }

   @Injectable({ providedIn: 'root' })
   export class AuthService {
     readonly currentUser = signal<CurrentUser | null>(null);

     login(_email: string, _password: string, _rememberMe: boolean): Promise<void> {
       throw new Error('AuthService.login not implemented until Phase 2');
     }

     logout(): Promise<void> {
       throw new Error('AuthService.logout not implemented until Phase 2');
     }

     fetchMe(): Promise<void> {
       throw new Error('AuthService.fetchMe not implemented until Phase 2');
     }
   }
   ```

6. **Shell components** (standalone): `AppShellComponent`, `HeaderComponent`, `FooterComponent` under `angular-app/src/app/shell/`. `HeaderComponent` reads `authService.currentUser()` and renders the logged-out nav (Home/Help/Log in/Sign up) since the stub always returns `null` — this is intentionally revisited once Phase 2 lands.

7. **Do not** create feature folders (`src/app/features/*`) — those are `feature-migrate`'s job, one at a time, driven by an approved spec.

## Output

`angular-app/` — a working `ng serve`-able empty shell: routing configured, SCSS, strict TS, stub `AuthService`, `HeaderComponent`/`FooterComponent`, proxy to Rails on :3001. No feature modules yet.
