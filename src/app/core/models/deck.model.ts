export interface Deck {
  id: number;
  title: string;
  /** Nullable in the database. */
  description: string | null;
  /** Nullable free-form label, e.g. "IELTS". */
  category: string | null;
  isPublic: boolean;
  creatorId: number;
  creatorUsername: string;
  createdAt: string;
}

export interface DeckRequest {
  title: string;
  description: string;
  category: string;
  isPublic: boolean;
}

/** Shape of a Spring Data Page as serialized to JSON. */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
