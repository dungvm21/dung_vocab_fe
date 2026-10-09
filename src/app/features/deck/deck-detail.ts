import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Card, CardRequest } from '../../core/models/card.model';
import { Deck } from '../../core/models/deck.model';
import { AuthService } from '../../core/services/auth.service';
import { CardService } from '../../core/services/card.service';
import { DeckService } from '../../core/services/deck.service';
import { ReviewService } from '../../core/services/review.service';
import { DeckFormModal } from '../dashboard/deck-form-modal';

@Component({
  selector: 'app-deck-detail',
  imports: [ReactiveFormsModule, RouterLink, DeckFormModal],
  templateUrl: './deck-detail.html',
  styleUrl: './deck-detail.css',
})
export class DeckDetail implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly deckService = inject(DeckService);
  private readonly cardService = inject(CardService);
  private readonly reviewService = inject(ReviewService);
  private readonly auth = inject(AuthService);

  /** Route param, bound via withComponentInputBinding. */
  readonly deckId = input.required<number>();

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly deck = signal<Deck | null>(null);
  protected readonly cards = signal<Card[]>([]);

  protected readonly editingCardId = signal<number | null>(null);
  protected readonly modalOpen = signal(false);

  /** SRS enrollment — save state is only known after an idempotent save probe. */
  protected readonly savedIds = signal<Set<number>>(new Set());
  protected readonly togglingCardId = signal<number | null>(null);
  protected readonly enrolling = signal(false);
  protected readonly enrollMessage = signal<string | null>(null);

  protected readonly isOwner = computed(
    () => this.deck()?.creatorId === this.auth.currentUser()?.id,
  );

  protected readonly isEmpty = computed(
    () => !this.loading() && this.error() === null && this.cards().length === 0,
  );

  protected readonly addForm = this.fb.nonNullable.group({
    term: ['', [Validators.required, Validators.maxLength(255)]],
    definition: ['', [Validators.required, Validators.maxLength(2000)]],
    hint: ['', [Validators.maxLength(1000)]],
  });
  protected readonly editForm = this.fb.nonNullable.group({
    term: ['', [Validators.required, Validators.maxLength(255)]],
    definition: ['', [Validators.required, Validators.maxLength(2000)]],
    hint: ['', [Validators.maxLength(1000)]],
  });

  ngOnInit(): void {
    this.load();
  }

  protected startEdit(card: Card): void {
    this.editingCardId.set(card.id);
    this.editForm.setValue({
      term: card.term,
      definition: card.definition,
      hint: card.hint ?? '',
    });
  }

  protected cancelEdit(): void {
    this.editingCardId.set(null);
  }

  protected saveDeckChanges(): void {
    this.deckService.getDeck(this.deckId()).subscribe({
      next: (updated) => this.deck.set(updated),
      error: (err: Error) => this.error.set(err.message),
    });
  }

  protected addCard(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }

    const { term, definition, hint } = this.addForm.getRawValue();
    const payload: CardRequest = { term, definition, hint: hint || undefined };
    this.cardService.createCard(this.deckId(), payload).subscribe({
      next: (card) => {
        this.cards.update((cards) => [...cards, card]);
        this.addForm.reset();
      },
      error: (err: Error) => this.error.set(err.message),
    });
  }

  protected updateCard(cardId: number): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const { term, definition, hint } = this.editForm.getRawValue();
    const payload: CardRequest = { term, definition, hint: hint || undefined };
    this.cardService.updateCard(this.deckId(), cardId, payload).subscribe({
      next: (updated) => {
        this.cards.update((cards) => cards.map((c) => (c.id === cardId ? updated : c)));
        this.editingCardId.set(null);
      },
      error: (err: Error) => this.error.set(err.message),
    });
  }

  protected deleteCard(cardId: number): void {
    if (!confirm('Xóa thẻ này?')) return;

    this.cardService.deleteCard(this.deckId(), cardId).subscribe({
      next: () => this.cards.update((cards) => cards.filter((c) => c.id !== cardId)),
      error: (err: Error) => this.error.set(err.message),
    });
  }

  /** Adds every card of this deck to the user's SRS review queue. */
  protected enrollDeck(): void {
    if (this.enrolling()) return;

    this.enrolling.set(true);
    this.enrollMessage.set(null);
    this.reviewService.enrollDeck(this.deckId()).subscribe({
      next: (result) => {
        this.enrolling.set(false);
        this.enrollMessage.set(
          result.newlyEnrolled === 0 && result.totalCards > 0
            ? `Cả ${result.alreadyEnrolled} thẻ đã có trong hàng ôn tập.`
            : `Đã thêm ${result.newlyEnrolled}/${result.totalCards} thẻ vào hàng ôn tập — vào "Ôn tập" để bắt đầu.`,
        );
      },
      error: (err: Error) => {
        this.enrolling.set(false);
        this.enrollMessage.set(err.message);
      },
    });
  }

  /**
   * Toggles one card in the SRS queue. Initial state is unknown (no GET endpoint),
   * so the first click is an idempotent save probe: saved=false means it was
   * already enqueued — mark it saved and show the remove action from now on.
   */
  protected toggleReviewQueue(card: Card): void {
    if (this.togglingCardId() !== null) return;

    this.togglingCardId.set(card.id);
    if (this.savedIds().has(card.id)) {
      this.reviewService.removeCard(card.id).subscribe({
        next: () => {
          this.savedIds.update((ids) => {
            const next = new Set(ids);
            next.delete(card.id);
            return next;
          });
          this.togglingCardId.set(null);
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.togglingCardId.set(null);
        },
      });
    } else {
      this.reviewService.saveCard(card.id).subscribe({
        next: (result) => {
          this.savedIds.update((ids) => new Set(ids).add(card.id));
          this.enrollMessage.set(result.saved ? `Đã thêm "${card.term}" vào ôn tập.` : null);
          this.togglingCardId.set(null);
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.togglingCardId.set(null);
        },
      });
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
