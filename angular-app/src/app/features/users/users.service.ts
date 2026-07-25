import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../../core/models/user.model';

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface Micropost {
  id: number;
  content: string;
  createdAt: string;
}

export interface Pagination {
  page: number;
  perPage: number;
  totalPages: number;
  totalCount: number;
}

export interface UserShowResponse {
  user: User;
  microposts: Micropost[];
  pagination: Pagination;
}

export interface UserListResponse {
  users: User[];
  pagination: Pagination;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  signup(request: SignupRequest): Promise<{ message: string }> {
    return firstValueFrom(
      this.http.post<{ message: string }>(`${environment.apiBaseUrl}/users`, { user: request }),
    );
  }

  show(id: number): Promise<UserShowResponse> {
    return firstValueFrom(this.http.get<UserShowResponse>(`${environment.apiBaseUrl}/users/${id}`));
  }

  update(id: number, request: Partial<SignupRequest>): Promise<{ user: User }> {
    return firstValueFrom(
      this.http.patch<{ user: User }>(`${environment.apiBaseUrl}/users/${id}`, { user: request }),
    );
  }

  index(page = 1): Promise<UserListResponse> {
    return firstValueFrom(
      this.http.get<UserListResponse>(`${environment.apiBaseUrl}/users`, { params: { page } }),
    );
  }
}
