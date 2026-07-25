import { Injectable, inject } from '@angular/core';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { Title } from '@angular/platform-browser';

const BASE_TITLE = 'Ruby on Rails Tutorial Sample App';

/**
 * Mirrors rails-src/app/helpers/application_helper.rb#full_title:
 * empty page title -> base title alone; otherwise "<page> | <base>".
 */
@Injectable({ providedIn: 'root' })
export class RailsFullTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const pageTitle = this.buildTitle(snapshot) ?? '';
    this.title.setTitle(pageTitle ? `${pageTitle} | ${BASE_TITLE}` : BASE_TITLE);
  }
}
