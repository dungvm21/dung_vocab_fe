import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Deck, DeckRequest, Page } from '../models/deck.model';

@Injectable({ providedIn: 'root' })
export class DeckService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/decks`;

  /** Decks owned by the authenticated user (public and private). */
  getMyDecks(): Observable<Deck[]> {
    return this.http
      .get<Page<Deck>>(`${this.baseUrl}/me`, { params: { size: '100' } })
      .pipe(map((page) => page.content));
  }

  /** Search public decks, optionally filtered by query and category. */
  searchPublicDecks(q = '', category = ''): Observable<Deck[]> {
    let params = new HttpParams().set('size', '100');
    if (q) params = params.set('q', q);
    if (category) params = params.set('category', category);
    return this.http
      .get<Page<Deck>>(`${this.baseUrl}/search`, { params })
      .pipe(map((page) => page.content));
  }

  getDeck(id: number): Observable<Deck> {
    return this.http.get<Deck>(`${this.baseUrl}/${id}`);
  }

  createDeck(payload: DeckRequest): Observable<Deck> {
    return this.http.post<Deck>(this.baseUrl, payload);
  }

  updateDeck(id: number, payload: DeckRequest): Observable<Deck> {
    return this.http.put<Deck>(`${this.baseUrl}/${id}`, payload);
  }

  deleteDeck(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
