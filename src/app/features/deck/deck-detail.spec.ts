import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authInterceptor } from '../../core/interceptors/auth.interceptor';
import { DeckDetail } from './deck-detail';

const MOCK_DECK = {
  id: 6,
  title: 'GRE 3000',
  description: null,
  category: 'Ngoại ngữ',
  creatorId: 1,
  creatorUsername: 'me',
  isPublic: true,
  createdAt: '2026-01-01T00:00:00Z',
};

describe('DeckDetail — delete flow', () => {
  let fixture: ComponentFixture<DeckDetail>;
  let el: HTMLElement;
  let http: HttpTestingController;
  const routerSpy = { navigate: vi.fn().mockResolvedValue(true) };

  beforeEach(async () => {
    localStorage.setItem(
      'quizlet_fe.user',
      JSON.stringify({ id: 1, username: 'me', email: 'me@test.dev', role: 'USER' }),
    );
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [DeckDetail],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
        // RouterLink only reads snapshot params at init — an empty stub suffices.
        { provide: ActivatedRoute, useValue: {} },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DeckDetail);
    el = fixture.nativeElement;
    fixture.componentRef.setInput('deckId', 6);
    fixture.detectChanges(); // triggers ngOnInit → load()
  });

  /** Answers the three parallel requests fired by load(). */
  function flushDeckLoad(): void {
    http.expectOne('/api/decks/6').flush(MOCK_DECK);
    http.expectOne('/api/decks/6/cards').flush([]);
    http.expectOne('/api/reviews/saved').flush([]);
  }

  function deleteToolbarButton(): HTMLButtonElement {
    return Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Xoá',
    ) as HTMLButtonElement;
  }

  it('opens the typed-confirmation modal instead of native confirm', async () => {
    flushDeckLoad();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.querySelector('[role="dialog"]')).toBeNull();
    deleteToolbarButton().click();
    fixture.detectChanges();

    const dialog = el.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain('Xoá bộ thẻ');
    expect(dialog.textContent).toContain('Đang có 0 người đang học deck này');
  });

  it('DELETEs the deck only after typing "Xoá", then navigates to dashboard', async () => {
    flushDeckLoad();
    await fixture.whenStable();
    fixture.detectChanges();
    deleteToolbarButton().click();
    fixture.detectChanges();

    const dialog = el.querySelector('[role="dialog"]') as HTMLElement;
    const confirmButton = Array.from(dialog.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Xoá vĩnh viễn'),
    ) as HTMLButtonElement;
    expect(confirmButton.disabled).toBe(true);

    const input = dialog.querySelector<HTMLInputElement>('#confirm-modal-input') as HTMLInputElement;
    input.value = 'Xoá';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(confirmButton.disabled).toBe(false);

    confirmButton.click();
    fixture.detectChanges();

    http
      .expectOne({ method: 'DELETE', url: '/api/decks/6' })
      .flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('keeps the modal and shows a danger notice when DELETE fails', async () => {
    flushDeckLoad();
    await fixture.whenStable();
    fixture.detectChanges();
    deleteToolbarButton().click();
    fixture.detectChanges();

    const dialog = el.querySelector('[role="dialog"]') as HTMLElement;
    const input = dialog.querySelector<HTMLInputElement>('#confirm-modal-input') as HTMLInputElement;
    input.value = 'Xoá';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const confirmButton = Array.from(dialog.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Xoá vĩnh viễn'),
    ) as HTMLButtonElement;
    confirmButton.click();
    fixture.detectChanges();

    http
      .expectOne({ method: 'DELETE', url: '/api/decks/6' })
      .flush({ message: 'Not owner' }, { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(routerSpy.navigate).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Not owner');
  });

  it('shows the not-found panel when the deck was deleted by its owner', async () => {
    http
      .expectOne('/api/decks/6')
      .flush({ message: 'Deck not found' }, { status: 404, statusText: 'Not Found' });
    http
      .expectOne('/api/decks/6/cards')
      .flush({ message: 'Deck not found' }, { status: 404, statusText: 'Not Found' });
    http.expectOne('/api/reviews/saved').flush([]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.textContent).toContain('Bộ thẻ đã bị xoá bởi tác giả hoặc không tồn tại');
    expect(deleteToolbarButton()).toBeUndefined();
  });
});
