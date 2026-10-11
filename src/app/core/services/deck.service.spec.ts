import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { Deck } from '../models/deck.model';
import { DeckService } from './deck.service';

describe('DeckService', () => {
  let service: DeckService;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    service = TestBed.inject(DeckService);
    http = TestBed.inject(HttpTestingController);
  });

  it('getMyDecks flattens the Spring Page into its content', () => {
    const decks = [{ id: 1 }, { id: 2 }] as unknown as Deck[];
    let result: Deck[] | undefined;

    service.getMyDecks().subscribe((d) => (result = d));
    http.expectOne('/api/decks/me?size=100').flush({ content: decks, totalElements: 2 });

    expect(result).toEqual(decks);
  });

  it('getDeck GETs by id', () => {
    let result: Deck | undefined;

    service.getDeck(6).subscribe((d) => (result = d));
    http.expectOne('/api/decks/6').flush({ id: 6 } as Deck);

    expect(result?.id).toBe(6);
  });

  it('deleteDeck issues DELETE and completes on 204', () => {
    let done = false;

    service.deleteDeck(6).subscribe(() => (done = true));
    http
      .expectOne({ method: 'DELETE', url: '/api/decks/6' })
      .flush(null, { status: 204, statusText: 'No Content' });

    expect(done).toBe(true);
  });
});
