import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  DueReviewsResponse,
  EnrollResult,
  ReviewItem,
  ReviewQuality,
  ReviewResult,
  SavedReviewResult,
} from '../models/review.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/reviews`;

  /** All cards scheduled for review today, across every deck (oldest due first). */
  getDueCards(limit = 20): Observable<ReviewItem[]> {
    return this.http
      .get<DueReviewsResponse>(`${this.baseUrl}/due`, { params: { limit } })
      .pipe(map((response) => response.items));
  }

  /** Rates one card; backend applies the SM-2 algorithm and reschedules it. */
  submitReview(cardId: number, quality: ReviewQuality): Observable<ReviewResult> {
    return this.http.post<ReviewResult>(`${this.baseUrl}/${cardId}`, { quality });
  }

  /** Adds one card to the caller's review queue, due immediately. Idempotent. */
  saveCard(cardId: number): Observable<SavedReviewResult> {
    return this.http.post<SavedReviewResult>(`${this.baseUrl}/${cardId}/save`, {});
  }

  /** Adds every card of a deck to the review queue. Idempotent per card; works on public decks. */
  enrollDeck(deckId: number): Observable<EnrollResult> {
    return this.http.post<EnrollResult>(`${this.baseUrl}/decks/${deckId}/enroll`, {});
  }

  /** Removes a card from the review queue (SRS only — MCQ progress untouched). 204. */
  removeCard(cardId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${cardId}`);
  }
}
