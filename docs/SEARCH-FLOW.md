# Luồng tìm kiếm (Search) trên Dashboard — Tài liệu FE

> Mô tả đầy đủ luồng hoạt động của ô tìm kiếm ở trang Dashboard (`/dashboard`), gồm hai cơ chế khác nhau cho hai tab: **Bộ của tôi** (lọc client-side) và **Công khai** (tìm server-side có debounce).

---

## 1. Tổng quan

Ô search là **một input duy nhất** ở dashboard, dùng chung signal `search` cho cả hai tab. Cùng một chuỗi gõ vào nhưng cơ chế xử lý **khác nhau hoàn toàn theo tab đang active**:

| Tab | Cơ chế | Tìm ở đâu | Tìm theo |
|---|---|---|---|
| Bộ của tôi (`mine`) | Lọc **client-side** (tức thì) | Mảng `myDecks` đã tải sẵn trong bộ nhớ | `title`, `category` |
| Công khai (`public`) | Tìm **server-side** (debounce 250ms) | Gọi API `GET /api/decks/search` | `q` (backend tự khớp title/category) |

Lý do tách hai cơ chế: deck của mình chỉ tối đa ~100 (đã load 1 lần — lọc tại chỗ là ngay lập tức, không tốn network); deck công khai là dữ liệu toàn hệ thống (không thể load hết — phải nhờ backend truy vấn).

---

## 2. Các thành phần liên quan

```
dashboard.html                        dashboard.ts                         deck.service.ts            Backend
┌─────────────┐   (input)    ┌──────────────────────┐   HTTP    ┌─────────────────────┐   ┌──────────────┐
│ <input       │─────────────►│ search = signal('')  │──────────►│ searchPublicDecks() │──►│ GET /decks/  │
│  [value]     │              │ visibleDecks =       │           │ getMyDecks()        │   │ search / me  │
│  (input)]    │              │   computed(...)      │           └─────────────────────┘   └──────────────┘
└─────────────┘               │ effect (debounce)    │
                              └──────────────────────┘
```

- **`search`** (`dashboard.ts:28`) — `signal('')`, nguồn dữ liệu duy nhất của chuỗi tìm kiếm.
- **`visibleDecks`** (`dashboard.ts:31`) — `computed` quyết định danh sách deck hiển thị.
- **`effect`** (`dashboard.ts:55`) — theo dõi `search` + `tab`, chủ động gọi API cho tab công khai.
- **`searchTimer`** (`dashboard.ts:46`) — ID của `setTimeout`, dùng để hủy lần debounce trước.

---

## 3. Luồng chi tiết

### 3.1 Tab "Bộ của tôi" — lọc tức thời, không gọi API

```
User gõ "anh"
   │
   ▼
(input) → search.set('anh')
   │
   ▼
visibleDecks tự tính lại (computed đọc search()):
   1. query = 'anh'.trim().toLowerCase()
   2. query rỗng? → trả nguyên myDecks()
   3. Ngược lại → lọc: deck.title HOẶC deck.category chứa 'anh'
      (deck.category nullable → null-guard bằng (deck.category ?? ''))
   │
   ▼
Template @for (deck of visibleDecks()) render lại ngay
```

Đặc điểm:
- **Không có network** — mượt, phản hồi tức thì trên từng phím.
- So khớp **không phân biệt hoa/thường** (cả hai bên `toLowerCase()`).
- Nguồn dữ liệu là kết quả của `GET /api/decks/me` đã tải lúc vào trang (`loadDecks()`, `size=100`, FE bóc `page.content`).

### 3.2 Tab "Công khai" — debounce 250ms rồi gọi API

```
User gõ từng phím → search.set(...) thay đổi
   │
   ▼
effect chạy lại mỗi khi search() hoặc tab() đổi
   │
   ├── tab() !== 'public' → return (không làm gì)
   │
   ▼
clearTimeout(searchTimer)   ← hủy lịch chạy trước đó
searchTimer = setTimeout(run, 250)
   │
   ├── user gõ tiếp trong vòng 250ms → effect chạy lại → hủy lịch cũ, đặt lịch mới
   │                                   (chỉ phím CUỐI cùng mới sống sót)
   ▼
sau 250ms im lặng:
   deckService.searchPublicDecks(query)
   │  GET /api/decks/search?q=<query>&size=100
   │  (query rỗng → không gửi param q → backend trả toàn bộ deck public)
   ▼
   next: publicDecks.set(decks)  → visibleDecks() (nhánh public) render lại
   error: error.set(err.message) → banner đỏ trên trang
```

Đặc điểm:
- **Debounce 250ms** — giảm số request khi gõ nhanh (10 ký tự = tối đa 1 request thay vì 10).
- Kết quả **ghi đè** `publicDecks` (không cộng dồn) — luôn phản ánh lần tìm gần nhất.
- Lưu ý hiện tại: các response không được đánh dấu "lần nào mới nhất" — nếu 2 request trả về lệch thứ tự, kết quả hiển thị có thể là của request cũ tới sau (hiếm gặp với debounce 250ms; có thể vá bằng `switchMap` nếu cần).

### 3.3 Tải lần đầu

```
Vào /dashboard
   │
   ├── getMyDecks()      → GET /api/decks/me          → myDecks
   └── searchPublicDecks() → GET /api/decks/search    (không q → tất cả public) → publicDecks
```

Cả hai tab đều có sẵn dữ liệu ngay từ đầu; search chỉ là bước lọc/gọi lại phía trên.

### 3.4 Đổi tab

`setTab()` đổi signal `tab` → hai phản ứng cùng lúc:
1. `visibleDecks` (computed) đổi nhánh → render danh sách của tab mới ngay lập tức.
2. `effect` chạy lại → nếu tab mới là `public`, sẽ debounce rồi gọi API với `search()` hiện tại (kể cả rỗng — để chắc chắn dữ liệu tab public là mới nhất theo query đang giữ).

---

## 4. Contract API (tab công khai)

```
GET /api/decks/search?q=<chuỗi>&size=100
```

- `q` — tùy chọn; backend khớp **title hoặc category** (không phân biệt hoa/thường). Bỏ qua `q` = lấy tất cả.
- `category` — tùy chọn (FE hiện chưa gửi từ UI).
- Trả về **Spring Page** — FE bóc `.content` thành `Deck[]` (`Page<T>` trong `deck.model.ts`).
- Endpoint public — không cần JWT.

---

## 5. Góc nhìn hiệu năng & giới hạn

| Điểm | Chi tiết |
|---|---|
| Debounce 250ms | Chỉ áp dụng tab public; tab mine lọc tức thì không tốn request |
| `size=100` | Cả `/me` lẫn `/search` giới hạn 100 kết quả — nếu backend có >100 public deck, phần còn lại không bao giờ hiển thị (chưa có phân trang FE) |
| Không hủy request đang bay | Dùng `setTimeout` chứ không `switchMap` — request cũ có thể về sau request mới (xem 3.2) |
| Không phân biệt dấu tiếng Việt | Cả hai cơ chế so khớp chuỗi thô; "toán" không khớp "toán học" có dấu khác — phụ thuộc cách backend normalize (hiện không normalize) |
| Timer dư khi rời trang | `searchTimer` không được clear trong `ngOnDestroy` — component dashboard bị hủy thì callback vẫn bắn (gọi service trên component đã chết). Vô hại về dữ liệu nhưng là điểm cần biết nếu refactor |

---

## 6. Sơ đồ tổng (cả hai tab)

```
                 ┌─────────────────────────── search signal ───────────────────────────┐
                 │                                                                      │
         tab = 'mine'                                                          tab = 'public'
                 │                                                                      │
                 ▼                                                                      ▼
      visibleDecks (computed)                                                  effect + debounce 250ms
      lọc myDecks theo title/                                                          │
      category (lowercase)                                                             ▼
                 │                                                      GET /api/decks/search?q=
                 │                                                                      │
                 │                                                       publicDecks.set(...)
                 │                                                                      │
                 └──────────────► visibleDecks() ← template @for ◄──────────────────────┘
```
