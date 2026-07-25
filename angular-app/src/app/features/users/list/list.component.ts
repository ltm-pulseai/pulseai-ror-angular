import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UsersService, UserListResponse } from '../users.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss',
})
export class ListComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  protected readonly data = signal<UserListResponse | null>(null);

  async ngOnInit(): Promise<void> {
    this.data.set(await this.usersService.index());
  }
}
