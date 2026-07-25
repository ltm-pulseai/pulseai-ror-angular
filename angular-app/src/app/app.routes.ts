import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/static-pages/home/home.component').then((m) => m.HomeComponent),
    title: '',
  },
  {
    path: 'help',
    loadComponent: () =>
      import('./features/static-pages/help/help.component').then((m) => m.HelpComponent),
    title: 'Help',
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./features/static-pages/about/about.component').then((m) => m.AboutComponent),
    title: 'About',
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/static-pages/contact/contact.component').then((m) => m.ContactComponent),
    title: 'Contact',
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./features/users/signup/signup.component').then((m) => m.SignupComponent),
    title: 'Sign up',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/sessions/login/login.component').then((m) => m.LoginComponent),
    title: 'Log in',
  },
  {
    path: 'users',
    loadComponent: () =>
      import('./features/users/list/list.component').then((m) => m.ListComponent),
    title: 'All users',
    canActivate: [authGuard],
  },
  {
    path: 'users/:id/edit',
    loadComponent: () =>
      import('./features/users/edit/edit.component').then((m) => m.EditComponent),
    title: 'Edit your profile',
    canActivate: [authGuard],
  },
  {
    path: 'users/:id',
    loadComponent: () =>
      import('./features/users/profile/profile.component').then((m) => m.ProfileComponent),
    title: 'Profile',
  },
  {
    path: 'password_resets/new',
    loadComponent: () =>
      import('./features/password-resets/request/request.component').then(
        (m) => m.RequestComponent,
      ),
    title: 'Forgot password',
  },
  {
    path: 'password_resets/:token/edit',
    loadComponent: () =>
      import('./features/password-resets/edit/edit.component').then((m) => m.EditComponent),
    title: 'Reset password',
  },
  {
    path: 'account_activations/:token/edit',
    loadComponent: () =>
      import('./features/account-activations/account-activation.component').then(
        (m) => m.AccountActivationComponent,
      ),
    title: 'Activating account',
  },
];
