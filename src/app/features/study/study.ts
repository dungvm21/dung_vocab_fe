import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Card } from '../../core/models/card.model';
import { Deck } from '../../core/models/deck.model';
import { DeckProgress, QuizQuestion, StudyAnswerResponse } from '../../core/models/study.model';
import { CardService } from '../../core/services/card.service';
import { DeckService } from '../../core/services/deck.service';
import { StudyService } from '../../core/services/study.service';

type StudyTab = 'flip' | 'quiz';

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
  private readonly studyService = inject(StudyService);

  /** Route param, bound via withComponentInputBinding. */
  readonly deckId = input.required<number>();

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly deck = signal<Deck | null>(null);
  protected readonly cards = signal<Card[]>([]);

  // ── Flip mode state ────────────────────────────────────────────────
  protected readonly tab = signal<StudyTab>('flip');
  protected readonly index = signal(0);
  protected readonly flipped = signal(false);
  protected readonly shuffled = signal(false);

  // ── Quiz mode state ────────────────────────────────────────────────
  protected readonly quizLoading = signal(false);
  protected readonly questions = signal<QuizQuestion[]>([]);
  protected readonly quizIndex = signal(0);
  protected readonly selectedOptionId = signal<number | null>(null);
  protected readonly lastAnswer = signal<StudyAnswerResponse | null>(null);
  protected readonly deckProgress = signal<DeckProgress | null>(null);
  protected readonly quizFinished = signal(false);

  protected readonly currentCard = computed<Card | null>(() => this.cards()[this.index()] ?? null);
  protected readonly progress = computed(() => `${this.index() + 1} / ${this.cards().length}`);
  protected readonly progressPercent = computed(() =>
    this.cards().length === 0 ? 0 : ((this.index() + 1) / this.cards().length) * 100,
  );

  protected readonly currentQuestion = computed(() => this.questions()[this.quizIndex()] ?? null);
  protected readonly answered = computed(() => this.lastAnswer() !== null);

  ngOnInit(): void {
    this.load();
  }

  // ── Tabs ───────────────────────────────────────────────────────────

  protected setTab(tab: StudyTab): void {
    this.tab.set(tab);
    if (tab === 'quiz' && this.questions().length === 0 && !this.quizFinished()) {
      this.startQuiz();
    }
  }

  // ── Flip mode ──────────────────────────────────────────────────────

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

  // ── Quiz mode ──────────────────────────────────────────────────────

  protected startQuiz(): void {
    this.quizLoading.set(true);
    this.error.set(null);
    this.questions.set([]);
    this.quizIndex.set(0);
    this.selectedOptionId.set(null);
    this.lastAnswer.set(null);
    this.quizFinished.set(false);

    this.studyService
      .getQuiz(this.deckId(), 10)
      .pipe(finalize(() => this.quizLoading.set(false)))
      .subscribe({
        next: (questions) => this.questions.set(questions),
        error: (err: Error) => this.error.set(err.message),
      });
  }

  protected selectOption(cardId: number): void {
    const question = this.currentQuestion();
    if (!question || this.answered()) return;

    this.selectedOptionId.set(cardId);
    this.studyService.submitAnswer(this.deckId(), {
      cardId: question.cardId,
      selectedCardId: cardId,
      mode: 'MULTIPLE_CHOICE',
    }).subscribe({
      next: (response) => {
        this.lastAnswer.set(response);
        this.deckProgress.set(response.deckProgress);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.selectedOptionId.set(null);
      },
    });
  }

  protected skipQuestion(): void {
    const question = this.currentQuestion();
    if (!question || this.answered()) return;

    this.studyService.submitAnswer(this.deckId(), {
      cardId: question.cardId,
      selectedCardId: null,
      mode: 'MULTIPLE_CHOICE',
    }).subscribe({
      next: (response) => {
        this.lastAnswer.set(response);
        this.deckProgress.set(response.deckProgress);
      },
      error: (err: Error) => this.error.set(err.message),
    });
  }

  protected nextQuestion(): void {
    if (this.quizIndex() < this.questions().length - 1) {
      this.quizIndex.update((i) => i + 1);
      this.selectedOptionId.set(null);
      this.lastAnswer.set(null);
    } else {
      this.quizFinished.set(true);
    }
  }

  /** Did the given option win/lose? Only meaningful after answering. */
  protected optionState(cardId: number): 'correct' | 'wrong' | 'idle' {
    const answer = this.lastAnswer();
    if (!answer) return 'idle';
    if (cardId === answer.correctCardId) return 'correct';
    if (cardId === this.selectedOptionId()) return 'wrong';
    return 'idle';
  }

  // ── Keyboard ───────────────────────────────────────────────────────

  protected onKeydown(event: KeyboardEvent): void {
    if (this.tab() !== 'flip') return;
    if (event.key === 'ArrowRight') this.next();
    else if (event.key === 'ArrowLeft') this.previous();
    else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.flip();
    }
  }

  // ── Loading ────────────────────────────────────────────────────────

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
