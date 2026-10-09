/**
 * SRS review contract (backend: /api/reviews).
 * Quality follows modified SM-2 ratings:
 *  1 = forgot (again), 2 = hard, 3 = good, 4 = easy.
 */
export type ReviewQuality = 1 | 2 | 3 | 4;

/** One due card inside DueReviewsResponse.items. */
export interface ReviewItem {
  cardId: number;
  term: string;
  definition: string;
  hint: string | null;
  deckId: number;
  /** e.g. "NEW" / "LEARNING" / "REVIEW" — current SRS state. */
  status: string;
  intervalDays: number;
  easeFactor: number;
  repetition: number;
  /** ISO timestamp of the (past-due) next review date. */
  nextReviewDate: string;
}

/** Response for GET /api/reviews/due?limit=20. */
export interface DueReviewsResponse {
  dueCount: number;
  /** ISO timestamp from the server. */
  serverTime: string;
  items: ReviewItem[];
}

/** Response for POST /api/reviews/{cardId} — fresh SRS schedule. */
export interface ReviewResult {
  cardId: number;
  quality: ReviewQuality;
  status: string;
  intervalDays: number;
  easeFactor: number;
  repetition: number;
  /** ISO timestamp of next due date. */
  nextReviewDate: string;
}

/** Response for POST /api/reviews/{cardId}/save — idempotent queue add. */
export interface SavedReviewResult {
  cardId: number;
  /** true = newly added; false = already in the queue (schedule untouched). */
  saved: boolean;
  status: string;
  /** ISO timestamp — due time (now for a fresh save). */
  nextReviewDate: string;
}

/** Response for POST /api/reviews/decks/{deckId}/enroll — idempotent per card. */
export interface EnrollResult {
  deckId: number;
  totalCards: number;
  newlyEnrolled: number;
  alreadyEnrolled: number;
}
