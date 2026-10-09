import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  QuizQuestion,
  QuizResponse,
  StudyAnswerRequest,
  StudyAnswerResponse,
} from '../models/study.model';

@Injectable({ providedIn: 'root' })
export class StudyService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/decks`;

  /** MCQ round. Correct answers are graded server-side, never sent to the client. */
  getQuiz(deckId: number, count = 10): Observable<QuizQuestion[]> {
    return this.http
      .get<QuizResponse>(`${this.baseUrl}/${deckId}/study/quiz`, { params: { count } })
      .pipe(map((response) => response.questions));
  }

  /** Submits one answer; backend grades it and updates the learning state machine. */
  submitAnswer(deckId: number, payload: StudyAnswerRequest): Observable<StudyAnswerResponse> {
    return this.http.post<StudyAnswerResponse>(`${this.baseUrl}/${deckId}/study/answer`, payload);
  }
}
