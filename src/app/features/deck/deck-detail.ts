import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Card, CardRequest } from '../../core/models/card.model';
import { Deck } from '../../core/models/deck.model';
import { AuthService } from '../../core/services/auth.service';
import { CardService } from '../../core/services/card.service';
import { DeckService } from '../../core/services/deck.service';
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
  private readonly auth = inject(AuthService);

  /** Route param, bound via withComponentInputBinding. */
  readonly deckId = input.required<number>();

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly deck = signal<Deck | null>(null);
  protected readonly cards = signal<Card[]>([]);

  protected readonly editingCardId = signal<number | null>(null);
  protected readonly modalOpen = signal(false);

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
    if (!confirm('Delete this card?')) return;

    this.cardService.deleteCard(this.deckId(), cardId).subscribe({
      next: () => this.cards.update((cards) => cards.filter((c) => c.id !== cardId)),
      error: (err: Error) => this.error.set(err.message),
    });
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
