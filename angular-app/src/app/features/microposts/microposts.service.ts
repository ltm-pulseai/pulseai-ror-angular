import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MicropostImage {
  attached: boolean;
  url?: string;
  contentType?: string;
}

export interface Micropost {
  id: number;
  content: string;
  userId: number;
  createdAt: string;
  user: { id: number; name: string };
  image: MicropostImage;
}

export interface Pagination {
  page: number;
  perPage: number;
  totalPages: number;
  totalCount: number;
}

export interface FeedResponse {
  feedItems: Micropost[];
  pagination: Pagination | null;
}

@Injectable({ providedIn: 'root' })
export class MicropostsService {
  private readonly http = inject(HttpClient);

  feed(page = 1): Promise<FeedResponse> {
    return firstValueFrom(
      this.http.get<FeedResponse>(`${environment.apiBaseUrl}/feed`, { params: { page } }),
    );
  }

  create(content: string, image?: File): Promise<{ micropost: Micropost }> {
    const form = new FormData();
    form.append('micropost[content]', content);
    if (image) {
      form.append('micropost[image]', image);
    }
    return firstValueFrom(
      this.http.post<{ micropost: Micropost }>(`${environment.apiBaseUrl}/microposts`, form),
    );
  }

  destroy(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${environment.apiBaseUrl}/microposts/${id}`));
  }
}
