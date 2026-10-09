import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ReviewItem, ReviewQuality } from '../../core/models/review.model';
import { ReviewService } from '../../core/services/review.service';

interface Rating {
  score: ReviewQuality;
  label: string;
  classes: string;
}

@Component({
  selector: 'app-srs-review',
  imports: [RouterLink],
  templateUrl: './srs-review.html',
  styleUrl: './srs-review.css',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class SrsReview implements OnInit {
  private readonly reviewService = inject(ReviewService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly queue = signal<ReviewItem[]>([]);
  protected readonly index = signal(0);
  protected readonly flipped = signal(false);
  protected readonly submitting = signal(false);
  protected readonly finished = signal(false);

  protected readonly currentCard = computed(() => this.queue()[this.index()] ?? null);
  protected readonly progress = computed(() => `${this.index() + 1} / ${this.queue().length}`);
  protected readonly progressPercent = computed(() =>
    this.queue().length === 0 ? 0 : (this.index() / this.queue().length) * 100,
  );

  /** SRS rating buttons — shown after the first flip. */
  protected readonly ratings: Rating[] = [
    {
      score: 1,
      label: 'Quên / Lại',
      classes: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300',
    },
    {
      score: 2,
      label: 'Khó',
      classes: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300',
    },
    {
      score: 3,
      label: 'Được',
      classes: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 hover:border-sky-300',
    },
    {
      score: 4,
      label: 'Dễ',
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300',
    },
  ];

  ngOnInit(): void {
    this.load();
  }

  protected flip(): void {
    this.flipped.update((value) => !value);
  }

  protected rate(score: ReviewQuality): void {
    const card = this.currentCard();
    if (!card || this.submitting()) return;

    this.submitting.set(true);
    this.reviewService.submitReview(card.cardId, score).subscribe({
      next: () => this.advance(),
      error: (err: Error) => {
        this.error.set(err.message);
        this.submitting.set(false);
      },
    });
  }

  protected restart(): void {
    this.finished.set(false);
    this.load();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.flip();
      return;
    }
    const digit = Number(event.key);
    if (this.flipped() && digit >= 1 && digit <= 4) {
      this.rate(digit as ReviewQuality);
    }
  }

  private advance(): void {
    this.submitting.set(false);
    if (this.index() < this.queue().length - 1) {
      this.index.update((i) => i + 1);
      this.flipped.set(false);
    } else {
      this.finished.set(true);
    }
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.index.set(0);
    this.flipped.set(false);

    this.reviewService
      .getDueCards()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (cards) => this.queue.set(cards),
        error: (err: Error) => this.error.set(err.message),
      });
  }
}
