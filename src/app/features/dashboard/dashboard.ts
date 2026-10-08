import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Deck, DeckRequest } from '../../core/models/deck.model';
import { DeckService } from '../../core/services/deck.service';
import { DeckFormModal } from './deck-form-modal';

type Tab = 'mine' | 'public';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, RouterLink, DeckFormModal],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly deckService = inject(DeckService);
  private readonly router = inject(Router);

  protected readonly tab = signal<Tab>('mine');
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly myDecks = signal<Deck[]>([]);
  protected readonly publicDecks = signal<Deck[]>([]);
  protected readonly search = signal('');

  /** My decks are filtered client-side; public decks are filtered server-side (see effect below). */
  protected readonly visibleDecks = computed(() => {
    if (this.tab() === 'public') return this.publicDecks();
    const query = this.search().trim().toLowerCase();
    if (!query) return this.myDecks();
    return this.myDecks().filter(
      (deck) =>
        deck.title.toLowerCase().includes(query) ||
        (deck.category ?? '').toLowerCase().includes(query),
    );
  });

  /** Deck passed into the modal for editing; null = create mode. */
  protected readonly editingDeck = signal<Deck | null>(null);
  protected readonly modalOpen = signal(false);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly isOwner = (deck: Deck): boolean =>
    this.myDecks().some((mine) => mine.id === deck.id);

  constructor() {
    this.loadDecks();

    // Public tab: debounce server-side search (q matches title/category).
    effect(() => {
      const query = this.search().trim();
      if (this.tab() !== 'public') return;

      if (this.searchTimer !== null) clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.deckService.searchPublicDecks(query).subscribe({
          next: (decks) => this.publicDecks.set(decks),
          error: (err: Error) => this.error.set(err.message),
        });
      }, 250);
    });
  }

  protected setTab(tab: Tab): void {
    this.tab.set(tab);
  }

  protected openDeck(deckId: number): void {
    void this.router.navigate(['/decks', deckId]);
  }

  protected openCreate(): void {
    this.editingDeck.set(null);
    this.modalOpen.set(true);
  }

  protected openEdit(deck: Deck): void {
    this.editingDeck.set(deck);
    this.modalOpen.set(true);
  }

  protected saveModal(payload: DeckRequest): void {
    const editing = this.editingDeck();
    const request$ = editing
      ? this.deckService.updateDeck(editing.id, payload)
      : this.deckService.createDeck(payload);

    request$.subscribe({
      next: (deck) => {
        if (editing) {
          this.myDecks.update((decks) => decks.map((d) => (d.id === deck.id ? deck : d)));
        } else {
          this.myDecks.update((decks) => [deck, ...decks]);
        }
      },
      error: (err: Error) => this.error.set(err.message),
    });
  }

  protected deleteDeck(deck: Deck): void {
    if (!confirm(`Delete deck "${deck.title}"? This cannot be undone.`)) return;

    this.deckService.deleteDeck(deck.id).subscribe({
      next: () =>
        this.myDecks.update((decks) => decks.filter((d) => d.id !== deck.id)),
      error: (err: Error) => this.error.set(err.message),
    });
  }

  private loadDecks(): void {
    this.loading.set(true);
    this.error.set(null);

    this.deckService
      .getMyDecks()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (decks) => this.myDecks.set(decks),
        error: (err: Error) => this.error.set(err.message),
      });

    this.deckService.searchPublicDecks().subscribe({
      next: (decks) => this.publicDecks.set(decks),
      error: (err: Error) => this.error.set(err.message),
    });
  }
}
