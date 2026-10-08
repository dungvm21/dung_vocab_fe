import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Card } from '../../core/models/card.model';
import { Deck } from '../../core/models/deck.model';
import { CardService } from '../../core/services/card.service';
import { DeckService } from '../../core/services/deck.service';

@Component({
  selector: 'app-study',
  imports: [RouterLink],
  templateUrl: './study.html',
  styleUrl: './study.css',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class Study implements OnInit {
  private readonly deckService = inject(DeckService);
  private readonly cardService = inject(CardService);

  /** Route param, bound via withComponentInputBinding. */
  readonly deckId = input.required<number>();

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly deck = signal<Deck | null>(null);
  protected readonly cards = signal<Card[]>([]);

  protected readonly index = signal(0);
  protected readonly flipped = signal(false);
  protected readonly shuffled = signal(false);

  protected readonly currentCard = computed<Card | null>(() => this.cards()[this.index()] ?? null);
  protected readonly progress = computed(() => `${this.index() + 1} / ${this.cards().length}`);
  protected readonly progressPercent = computed(() =>
    this.cards().length === 0 ? 0 : ((this.index() + 1) / this.cards().length) * 100,
  );

  ngOnInit(): void {
    this.load();
  }

  protected flip(): void {
    this.flipped.update((value) => !value);
  }

  protected next(): void {
    if (this.index() < this.cards().length - 1) {
      this.index.update((i) => i + 1);
      this.flipped.set(false);
    }
  }

  protected previous(): void {
    if (this.index() > 0) {
      this.index.update((i) => i - 1);
      this.flipped.set(false);
    }
  }

  protected toggleShuffle(): void {
    this.shuffled.update((value) => !value);
    const cards = [...this.cards()];
    if (this.shuffled()) {
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
      this.cards.set(cards);
    }
    this.index.set(0);
    this.flipped.set(false);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') this.next();
    else if (event.key === 'ArrowLeft') this.previous();
    else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.flip();
    }
  }

  private load(): void {
    const deckId = this.deckId();
    this.loading.set(true);
    this.error.set(null);

    this.deckService.getDeck(deckId).subscribe({
      next: (deck) => this.deck.set(deck),
      error: (err: Error) => this.error.set(err.message),
    });

    this.cardService
      .getCards(deckId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (cards) => this.cards.set(cards),
        error: (err: Error) => this.error.set(err.message),
      });
  }
}
