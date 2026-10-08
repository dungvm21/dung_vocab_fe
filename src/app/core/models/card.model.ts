export interface Card {
  id: number;
  term: string;
  definition: string;
  /** Optional study hint shown on the card front. */
  hint: string | null;
  deckId: number;
}

export interface CardRequest {
  term: string;
  definition: string;
  hint?: string;
}
