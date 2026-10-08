# QuizletFake — Angular Frontend

Vocabulary-learning SPA (Quizlet clone) built with **Angular 21** (standalone components, signals, zoneless), **Tailwind CSS v4**, talking to the Spring Boot backend at `~/IdeaProjects/quizlet_fake`.

## Run

```bash
npm install
npm start          # http://localhost:4200, proxies /api → http://localhost:8081
```

Dev proxy: `proxy.conf.json` → Spring Boot on port **8081** (8080 is taken by Jenkins on this machine). Backend needs PostgreSQL (`docker/docker-compose.yml` in the backend repo) and Flyway migrations run at startup.

## Structure

```
src/app/
  core/
    models/            # User, Deck, Card, AuthRequest, AuthResponse, Page<T>
    services/          # AuthService, DeckService, CardService (inject() pattern)
    interceptors/      # authInterceptor — JWT bearer + error normalization
    guards/            # authGuard, guestGuard (functional)
  features/
    auth/login|register/   # Reactive forms + validation
    dashboard/             # Deck list (my/public tabs), search, DeckFormModal
    deck/deck-detail/      # Card CRUD inside a deck (owner-gated UI)
    study/                 # Flip-card player, keyboard nav, progress bar
```

## Backend API contract (as implemented)

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/auth/register` | `RegisterRequest` | `201 AuthResponse` |
| POST | `/api/auth/login` | `AuthRequest` | `AuthResponse` |
| GET | `/api/decks/me` | — | `Page<Deck>` (auth) |
| GET | `/api/decks/search?q=&category=&page=&size=` | — | `Page<Deck>` (public) |
| GET | `/api/decks/{id}` | — | `Deck` (public or owner) |
| POST | `/api/decks` | `DeckRequest` | `201 Deck` (auth) |
| PUT | `/api/decks/{id}` | `DeckRequest` | `Deck` (owner) |
| DELETE | `/api/decks/{id}` | — | `204` (owner) |
| GET | `/api/decks/{deckId}/cards` | — | `Card[]` |
| POST | `/api/decks/{deckId}/cards` | `CardRequest` | `201 Card` (owner) |
| PUT | `/api/decks/{deckId}/cards/{cardId}` | `CardRequest` | `Card` (owner) |
| DELETE | `/api/decks/{deckId}/cards/{cardId}` | — | `204` (owner) |

```ts
AuthRequest      { usernameOrEmail, password }
RegisterRequest  { username (3–50), email, password (8–100) }
AuthResponse     { accessToken, tokenType, id, username, email, role }
DeckRequest      { title (max 150), description (max 1000), category (max 100), isPublic }
Deck             { id, title, description, category, isPublic, creatorId, creatorUsername, createdAt }
CardRequest      { term (max 255), definition (max 2000), hint? (max 1000) }
Card             { id, term, definition, hint | null, deckId }
```

Error body: `{ timestamp, status, error, message, path }`. Jackson omits nulls (`non_null`), so optional fields like `hint` may be absent.
