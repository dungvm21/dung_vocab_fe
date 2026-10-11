import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ConfirmModal } from './confirm-modal';

describe('ConfirmModal', () => {
  let fixture: ComponentFixture<ConfirmModal>;
  let component: ConfirmModal;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmModal],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmModal);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.componentRef.setInput('title', 'Xoá bộ thẻ');
    fixture.componentRef.setInput('message', 'Đang có 36 người đang học deck này.');
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
  });

  function dialog(): HTMLElement {
    return el.querySelector('[role="dialog"]') as HTMLElement;
  }

  function typedInput(): HTMLInputElement {
    return dialog().querySelector<HTMLInputElement>('#confirm-modal-input') as HTMLInputElement;
  }

  function confirmButton(): HTMLButtonElement {
    return Array.from(dialog().querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Xoá vĩnh viễn'),
    ) as HTMLButtonElement;
  }

  function type(word: string): void {
    typedInput().value = word;
    typedInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('renders the dialog with title and message when open', () => {
    expect(dialog()).toBeTruthy();
    expect(el.textContent).toContain('Xoá bộ thẻ');
    expect(el.textContent).toContain('Đang có 36 người đang học deck này.');
  });

  it('renders nothing when closed', async () => {
    fixture.componentRef.setInput('open', false);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(dialog()).toBeNull();
  });

  it('keeps confirm disabled until the exact word is typed', () => {
    expect(confirmButton().disabled).toBe(true);

    type('xoa');
    expect(confirmButton().disabled).toBe(true);

    type('Xoá');
    expect(confirmButton().disabled).toBe(false);
  });

  it('accepts surrounding whitespace around the word', () => {
    type('  Xoá  ');
    expect(confirmButton().disabled).toBe(false);
  });

  it('emits confirmed exactly once on click and stays open (parent decides)', () => {
    let emissions = 0;
    component.confirmed.subscribe(() => emissions++);

    type('Xoá');
    confirmButton().click();
    fixture.detectChanges();

    expect(emissions).toBe(1);
    expect(dialog()).toBeTruthy();
  });

  it('closes when the cancel button is clicked', () => {
    const cancel = Array.from(dialog().querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Hủy',
    ) as HTMLButtonElement;
    cancel.click();
    fixture.detectChanges();

    expect(component.open()).toBe(false);
    expect(dialog()).toBeNull();
  });

  it('resets the typed word each time it opens', async () => {
    type('Xoá');
    fixture.componentRef.setInput('open', false);
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(typedInput().value).toBe('');
    expect(confirmButton().disabled).toBe(true);
  });
});
