import { Component, effect, inject, input, model, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Deck, DeckRequest } from '../../core/models/deck.model';

/**
 * Create / edit deck dialog. Pass an existing `deck` to edit, omit it to create.
 */
@Component({
  selector: 'app-deck-form-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './deck-form-modal.html',
  styleUrl: './deck-form-modal.css',
})
export class DeckFormModal {
  private readonly fb = inject(FormBuilder);

  /** Deck being edited, or null for create mode. */
  readonly deck = input<Deck | null>(null);

  /** Two-way bound open state; set false to close. */
  readonly open = model.required<boolean>();

  /** Emits the payload on submit. Parent decides create vs update. */
  readonly saved = output<DeckRequest>();

  protected readonly categories = ['Ngoại ngữ', 'Khoa học', 'Toán', 'Lịch sử', 'Nghệ thuật', 'Khác'];

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', [Validators.maxLength(1000)]],
    category: ['Other', [Validators.maxLength(100)]],
    isPublic: [false],
  });

  constructor() {
    effect(() => {
      const deck = this.deck();
      if (deck) {
        this.form.patchValue({
          title: deck.title,
          description: deck.description ?? '',
          category: deck.category ?? 'Khác',
          isPublic: deck.isPublic,
        });
      } else {
        this.form.reset({ title: '', description: '', category: 'Khác', isPublic: false });
      }
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saved.emit(this.form.getRawValue());
    this.close();
  }

  protected close(): void {
    this.open.set(false);
  }
}
