export type CardState = 'NOT_LEARNED' | 'STILL_LEARNING' | 'MASTERED';

export type StudyMode = 'MULTIPLE_CHOICE' | 'FLASHCARD';

export interface QuizOption {
  cardId: number;
  /** The term. */
  text: string;
}

export interface QuizQuestion {
  /** The card being asked about — echoing it back as selectedCardId means correct. */
  cardId: number;
  /** The definition to translate into a term. */
  prompt: string;
  options: QuizOption[];
}

/** Wrapper returned by GET /api/decks/{id}/study/quiz. */
export interface QuizResponse {
  deckId: number;
  /** e.g. "DEFINITION_TO_TERM" */
  direction: string;
  questions: QuizQuestion[];
}

export interface StudyAnswerRequest {
  cardId: number;
  /** null = skipped. */
  selectedCardId: number | null;
  /** Optional, defaults to MULTIPLE_CHOICE. */
  mode?: StudyMode;
}

export interface DeckProgress {
  total: number;
  mastered: number;
  stillLearning: number;
  notLearned: number;
  percent: number;
}

export interface StudyAnswerResponse {
  correct: boolean;
  cardId: number;
  correctCardId: number;
  correctTerm: string;
  state: CardState;
  consecutiveCorrect: number;
  deckProgress: DeckProgress;
}
