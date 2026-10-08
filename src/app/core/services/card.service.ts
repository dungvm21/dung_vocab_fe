import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Card, CardRequest } from '../models/card.model';

@Injectable({ providedIn: 'root' })
export class CardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/decks`;

  getCards(deckId: number): Observable<Card[]> {
    return this.http.get<Card[]>(`${this.baseUrl}/${deckId}/cards`);
  }

  createCard(deckId: number, payload: CardRequest): Observable<Card> {
    return this.http.post<Card>(`${this.baseUrl}/${deckId}/cards`, payload);
  }

  updateCard(deckId: number, cardId: number, payload: CardRequest): Observable<Card> {
    return this.http.put<Card>(`${this.baseUrl}/${deckId}/cards/${cardId}`, payload);
  }

  deleteCard(deckId: number, cardId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${deckId}/cards/${cardId}`);
  }
}
