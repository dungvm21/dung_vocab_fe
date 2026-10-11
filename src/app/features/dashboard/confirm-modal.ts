import { Component, computed, effect, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Generic destructive-action dialog. The user must type the exact confirm word
 * (default "Xoá") before the confirm button unlocks — no native window.confirm.
 */
@Component({
  selector: 'app-confirm-modal',
  imports: [FormsModule],
  templateUrl: './confirm-modal.html',
})
export class ConfirmModal {
  readonly title = input.required<string>();
  readonly message = input('');
  readonly confirmWord = input('Xoá');
  readonly confirmLabel = input('Xoá vĩnh viễn');
  /** True while the parent is performing the action — disables confirm. */
  readonly busy = input(false);

  /** Two-way bound open state; set false to close. */
  readonly open = model.required<boolean>();

  /** Emits once when the user confirms with the exact word. */
  readonly confirmed = output<void>();

  protected readonly typedWord = signal('');

  protected readonly wordMatches = computed(
    () => this.typedWord().trim() === this.confirmWord(),
  );

  constructor() {
    // Fresh input every time the dialog opens — never reuse a previous typing.
    effect(() => {
      if (this.open()) this.typedWord.set('');
    });
  }

  protected confirm(): void {
    if (!this.wordMatches() || this.busy()) return;
    this.confirmed.emit();
  }

  protected close(): void {
    this.open.set(false);
  }
}
