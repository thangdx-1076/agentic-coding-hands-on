---
status: implemented
authored_by: takumi
created: 2026-09-07
lang: vi
fcode: F009
---

# F009_KudosCompose

**Priority**: P1
**Type**: ui
**Generated**: 2026-09-07

**See also:** [`functional-spec.md`](./functional-spec.md) — tổng quan ngôn ngữ thường, Open
Decisions, Requirements/Business Rules một dòng, Screens, User Stories, Scenarios, Edge Cases.

## 1. Technical Overview

Tính năng cho Sunner đã đăng nhập mở dialog "Viết Kudo" đè lên trang `/kudos` để soạn và gửi một
lời cảm ơn có định dạng cơ bản tới đồng đội, kèm tối đa 5 hashtag, tối đa 5 ảnh và tuỳ chọn gửi ẩn
danh. Gồm 2 Server Action mới (tìm người nhận, ghi Kudo) và 1 migration mới (RLS insert + 2 cột
ẩn danh + bucket Storage); phần UI dựng bằng `<dialog>` native vì repo chưa có precedent modal nào.

## 2. Action Index

| # | Action (handler) | Method · Path | Codes | Writes | Detail |
|---|---|---|---|---|---|
| **A0** | *cross-cutting — belongs to no single action* | — | FR-601, BR-006 | — | § 4.4 |
| **A1** | `` `KudosComposeLauncher#handleActivate` `` | — *(client-side)* | FR-101, FR-102, SM-001 | — | § 3.1 |
| **A2** | `` `searchSunners` `` | `server action` · `searchSunners` | FR-202, US001 | — *(read-only)* | § 3.1 |
| **A3** | `` `useKudosComposeForm` `` | — *(client-side)* | FR-203, FR-204, FR-205, FR-206, FR-207, FR-403, FR-404, BR-002, BR-003, BR-004, BR-005, DEC-001, US002, US003, US004 | — | § 3.1 |
| **A4** | `` `createKudo` `` | `server action` · `createKudo` | FR-001, FR-002, FR-201, FR-208, FR-401, FR-402, BR-001, BR-002, BR-003, BR-004, DEC-002, US001, SM-001, INT-001 | `kudos`, `storage.objects` | § 3.1 ▸ **diagram** |

## 3. Actions

### 3.1 CAP-01 — Soạn và gửi Kudo

#### A1 · Mở modal Viết Kudo
`— (client-side)` → `` `KudosComposeLauncher#handleActivate` ``
`FR-101` `FR-102` · `SM-001` · `SCR008_KudosCompose`

**Who** · Sunner đang xem trang `/kudos`.
**FE** · Pill (`kudos-compose-pill.tsx`) là `<input readOnly role="button">` — presentational
thuần, chỉ báo `onActivate()` lên trên qua `onClick`/`onKeyDown` (Enter/Space). Quyết định thật —
mở dialog (`useKudosComposeDialog().open()`, `<dialog>.showModal()`) khi đã đăng nhập, hoặc
`router.push(ROUTES.LOGIN)` khi chưa — nằm ở `handleActivate()` trong
`kudos-compose-launcher.tsx:105-111`, dựa trên prop `isSignedIn` (`viewerId !== null`, tính ở
`kudos-client.tsx`, truyền qua `kudos-screen.tsx` → `kudos-keyvisual-band.tsx`).
**Request** · không có request server — quyết định dựa trên prop trạng thái đăng nhập page cha
truyền xuống.
**BE** · không có — hoàn toàn phía client bằng `<dialog>` native.
**Rule** · **BR-006 — Chưa đăng nhập thì không mở được modal, luôn có lớp chặn phía máy chủ đi
kèm.** `handleActivate()` kiểm tra `isSignedIn` trước khi gọi `dialog.open()`; lớp chặn phía máy
chủ thật sự là `createKudo`'s `auth.getUser()` (A4, A0). *(§ 4.4)*
**Result** · Modal chuyển từ `Closed` sang `Open`, không ghi dữ liệu.
**State** · `SM-001`: `Closed` → `Open` *(§ 4.3)*
**Source:** `src/app/(public)/kudos/_components/kudos-compose-pill.tsx:67-78`,
`src/app/(public)/kudos/_components/kudos-compose-launcher.tsx:105-111`,
`src/app/(public)/kudos/_hooks/use-kudos-compose-dialog.ts`

<!-- Không cần diagram: dưới ngưỡng — 0 write, 1 predicate render, đồng bộ. -->

---

#### A2 · Tìm kiếm người nhận
`server action` `searchSunners` → `` `searchSunners` ``
`FR-202` · `US001` · `SCR008_KudosCompose`

**Who** · Sunner đang gõ vào ô "Người nhận" trong modal đang mở *(gate A0 — § 4.4)*.
**FE** · Ô tìm kiếm autocomplete (`kudos-recipient-field.tsx`) gọi Server Action qua
`useRecipientSearch`/`useSunnerSuggest` (`use-sunner-suggest.ts`), debounce 250ms, tối thiểu 1 ký tự
(AD-6).
**Request** · tham số `query` *(string, tối thiểu 1 ký tự, cắt ở 128 ký tự trong action)*.
**BE** · `` `searchSunners(query)` `` (`_actions/search-sunners.ts:46-74`) tự `auth.getUser()`
trước, `!user` → trả `[]`; gọi `searchSunners(client, query, {limit})` (DAL,
`src/dal/sunner-search.ts:106-137`) — đọc view `profile_cards` bằng `ilike` trên `full_name`
(escape metacharacter `%`/`_`/`\`), giới hạn 8 dòng.
**Rule** · Chỉ đọc 3 cột `id, full_name, avatar_url` mà `profile_cards` đã phơi ra (`GRANT SELECT`
cho `authenticated`); không mở rộng SELECT list của view.
**Result** · Trả danh sách Sunner khớp tên để hiển thị trong dropdown gợi ý; không ghi dữ liệu.
**Source:** `src/app/(public)/kudos/_actions/search-sunners.ts:46-74`, `src/dal/sunner-search.ts:106-137`,
`src/dal/sunner-search-client.ts`

<!-- Không cần diagram: read-only, một bảng, đồng bộ. -->

---

#### A3 · Soạn nội dung Kudo
`— (client-side)` → `` `useKudosComposeForm` ``
`FR-203` `FR-204` `FR-205` `FR-206` `FR-207` `FR-403` `FR-404` · `US002` `US003` `US004`

**Who** · Sunner đang điền form trong modal đang mở *(gate A0 — § 4.4)*.
**FE** · Toolbar định dạng (B/I/S/số/link/quote, `kudos-format-toolbar.tsx`), textarea Nội dung
(`kudos-content-field.tsx` + `use-kudos-compose-content.ts`), dropdown Hashtag (tái dùng dữ liệu
tính sẵn của trang `/kudos`, `kudos-hashtag-field.tsx`/`kudos-hashtag-picker.tsx`), khung Image
(`kudos-image-field.tsx`), checkbox ẩn danh (`kudos-anonymous-field.tsx`) — toàn bộ state cục bộ
trong `useKudosComposeForm` (`use-kudos-compose-form.ts`), chưa gửi lên máy chủ.
**Request** · không có request server ở bước này.
**BE** · không có.
**Rule**
- **BR-002 — Hashtag tối thiểu 1 (kể cả Danh hiệu), tối đa 5 chip hiển thị thêm.** Nút "+ Hashtag"
  bị chặn thêm khi đã có 5 chip, hiện thông báo "Tối đa 5 hashtag". *(§ 4.4)*
- **BR-003 — Ảnh tối đa 5 file, chỉ nhận `.jpg`/`.png`.** Nút "+ Image" ẩn khi đã đủ 5 ảnh; file
  sai định dạng bị từ chối ngay tại bước chọn, chưa upload. *(§ 4.4)*
- **BR-004 — Bật ẩn danh bắt buộc có tên ẩn danh.** Checkbox bật thì ô tên ẩn danh hiện ra và trở
  thành điều kiện để nút Gửi được bật. *(§ 4.4)*
- **BR-005 — Toolbar chèn ký hiệu markdown-subset (`**b**`, `*i*`, `~~s~~`, `1. `, `[text](url)`,
  `> `) vào `<textarea>` thường, không dùng `dangerouslySetInnerHTML`.** Điểm chạm duy nhất vào file
  của F007: `kudos-card.tsx` nay gọi `<KudoMarkdownText text={card.content} />`
  (`kudo-markdown-text.tsx`, dựng trên `parse-kudo-markdown.ts`) thay vì render `{card.content}`
  thô.

| DEC | subtype | Condition | What the user sees | Source |
|---|---|---|---|---|
| **DEC-001** | interaction | click checkbox "Gửi ẩn danh" | hiện/ẩn ô nhập "Tên ẩn danh" | `kudos-anonymous-field.tsx`, `use-kudos-compose-form.ts` (`toggleAnonymous`) |

**Result** · Cập nhật state cục bộ (`recipientId, title, content, hashtags[], images[],
isAnonymous, anonymousName`) — chưa ghi gì xuống máy chủ; state này là input cho `A4`.
**Source:** `src/app/(public)/kudos/_hooks/use-kudos-compose-form.ts`,
`_hooks/{kudos-compose-draft,kudos-compose-form-rules,use-kudos-compose-attachments,use-kudos-compose-content}.ts`,
`_components/kudos-compose-form.tsx`

<!-- Không cần diagram: chỉ mutate state client, bảng DEC ở trên đã đủ thể hiện nhánh rẽ. -->

---

#### A4 · Gửi Kudo
`server action` `createKudo` → `` `createKudo` ``
`FR-001` `FR-002` `FR-201` `FR-208` `FR-401` `FR-402` · `US001` · `SM-001` · `INT-001`

**Who** · Sunner bấm nút "Gửi" *(gate A0 — § 4.4)*.
**FE** · Nút "Gửi" dùng `aria-disabled="true"` (KHÔNG `disabled` — AD-1, xem `docs/vi/system` note)
cho tới khi 4 trường bắt buộc (Người nhận, Danh hiệu, Nội dung, Hashtag ≥1) hợp lệ (`FR-208`,
`canSubmit` trong `use-kudos-compose-form.ts`); khi bấm hợp lệ, nút chuyển label sang
`copy.submitting` ("Đang gửi…").
**Request** · payload: `recipientId, title, content, hashtags[1..5], images[0..5], isAnonymous,
anonymousName?` — lắp bằng `buildKudoFormData` (`kudos-compose-draft.ts`).
**BE** · `` `createKudo(formData)` `` (`_actions/create-kudo.ts:95-165`) — theo đúng khuôn
`toggle-kudo-heart.ts`: tự `auth.getUser()`, validate tay bằng `validateKudoDraft`/
`validateKudoImages` (không dùng zod), upload ảnh lên Storage qua `uploadKudoImages`
(`upload-kudo-images.ts`) trước rồi mới `insert` bảng `kudos`. Migration `0009` (RLS insert + 2 cột
ẩn danh, `FR-002`) và `0010` (bucket Storage, `FR-001`) đã apply thành công trên instance local
(`supabase migration up`, xác nhận `migration-transcript.md`).
**Rule**
- **BR-001 — Danh hiệu lưu vào `hashtags[0]`, hashtag chip là `hashtags[1..5]`.** Mảng dài tối đa
  6 phần tử; không thêm cột `title` riêng để khỏi sửa lại `kudos_cards`/`kudos-card.tsx` đã ship ở
  F007.
- **BR-002 — Hashtag tối thiểu 1, tối đa 5.** Máy chủ chặn submit nếu mảng hashtag rỗng, lặp lại
  cùng luật đã áp ở client. *(§ 4.4)*
- **BR-003 — Ảnh tối đa 5, chỉ `.jpg`/`.png`.** Máy chủ validate lại loại file trước khi upload lên
  Storage, không tin riêng phía client. *(§ 4.4)*
- **BR-004 — Bật ẩn danh bắt buộc có tên ẩn danh.** [NEEDS_DOMAIN_CONFIRMATION] hành vi khi tên ẩn
  danh rỗng lúc bấm Gửi chưa được xác nhận — mặc định coi như lỗi trường bắt buộc (xem § 5.3, và
  Open Decision D001 trong functional-spec.md). *(§ 4.4)*

| DEC | subtype | Condition | What the user sees | Source |
|---|---|---|---|---|
| **DEC-002** | flow | thiếu ≥1 trong 4 trường bắt buộc khi submit | viền đỏ + thông báo lỗi đúng tại trường đó, modal không đóng | `deriveVisibleFieldErrors` (`kudos-compose-form-rules.ts`), `create-kudo.ts:116-132` (server-side lặp lại) |

**Result**
- Ghi `kudos.sender_id, receiver_id, content, hashtags, image_urls, is_anonymous,
  anonymous_name, created_at` ← từ payload đã validate (`hashtags = [title.trim(),
  ...normalizeHashtagChips(hashtagChips)]`, `create-kudo.ts:143-153`).
- Ghi file ảnh vào Storage bucket `kudo-images` qua `INT-001` (`uploadKudoImages`) — trả về URL
  công khai (`getPublicUrl`) để lưu vào `image_urls`. *(§ 4.5)*
- Gửi thành công: modal đóng (`onSubmitted` → `dialog.close()`), `revalidatePath(ROUTES.KUDOS)`
  để Kudo mới xuất hiện trên bảng (`FR-401`).
- Gửi thất bại: `reason: "unauthenticated" | "validation" | "upload" | "error"` — modal ở lại
  `Open`, hiện thông báo lỗi tương ứng (`resolveSubmitFailure`, `kudos-compose-form-rules.ts`); một
  lỗi insert SAU KHI ảnh đã upload thành công sẽ best-effort xoá ảnh đã lên trước khi trả lỗi (AD-5,
  không bao giờ để lại một hàng `kudos` thiếu ảnh).
**State** · `SM-001`: `Submitting` → `Closed` *(§ 4.3)*
**Source:** `src/app/(public)/kudos/_actions/create-kudo.ts`,
`src/app/(public)/kudos/_actions/upload-kudo-images.ts`

```mermaid
sequenceDiagram
    actor U as Sunner
    participant M as "KudosComposeForm (modal)"
    participant A as "createKudo (Server Action)"
    participant S as "Storage (kudo-images)"
    participant D as kudos

    U->>M: click "Gửi"
    M->>A: createKudo(payload)
    alt payload hợp lệ + đã đăng nhập
        A->>S: upload images (nếu có)
        S-->>A: image URLs
        A->>D: insert row
        A-->>M: {ok:true}
    else thiếu trường bắt buộc hoặc chưa đăng nhập
        A-->>M: {ok:false, reason}
    end
    M-->>U: đóng modal (thành công) hoặc hiện lỗi (thất bại)
```

### 3.2 Edge cases

| Action | Scenario | Behavior |
|---|---|---|
| A1 | bấm pill khi chưa đăng nhập | điều hướng `/login` thay vì mở modal (`FR-102`) |
| A2 | gõ ký tự đặc biệt (`@ # $`) vào ô Người nhận | danh sách lọc chính xác hoặc rỗng, không lỗi hệ thống |
| A3 | thêm hashtag/ảnh thứ 6 | bị chặn thêm, hiện thông báo giới hạn, không văng lỗi |
| A3 | chọn file không phải `.jpg`/`.png` | bị từ chối ngay tại bước chọn, không upload |
| A4 | bấm "Gửi" khi thiếu ≥1 trong 4 trường bắt buộc | viền đỏ + thông báo lỗi đúng trường, không đóng modal |
| A4 | chưa đăng nhập nhưng gọi thẳng Server Action (bỏ qua điều hướng) | `{ok:false, reason:"unauthenticated"}`, không ghi gì (`BR-006`, gate A0) |
| A1, A4 | bấm "Hủy" hoặc Escape giữa chừng | modal đóng ngay, không lưu dữ liệu đã nhập |

## 4. Shared Foundation

### 4.1 Components

| Component | Responsibility | Used in | File |
|---|---|---|---|
| `KudosComposePill` | pill presentational, báo `onActivate` lên launcher | A1 | `src/app/(public)/kudos/_components/kudos-compose-pill.tsx` |
| `KudosComposeLauncher` | quyết định mở dialog/điều hướng `/login`; wire dialog + form | A1, A3, A4 | `_components/kudos-compose-launcher.tsx` |
| `KudosComposeDialog`, `KudosComposeForm`, `KudosComposeBody`, `KudosComposeFooter` | vỏ `<dialog>` + layout form + nút Hủy/Gửi | A1, A3, A4 | `_components/kudos-compose-{dialog,form,body,footer}.tsx` |
| `KudosRecipientField`, `KudosTitleField`, `KudosContentField`, `KudosFormatToolbar`, `KudosHashtagField`, `KudosHashtagPicker`, `KudosImageField`, `KudosAnonymousField` | 6 field UI + toolbar + hashtag picker | A3 | `_components/kudos-{recipient,title,content,hashtag,image,anonymous}-field.tsx`, `kudos-format-toolbar.tsx`, `kudos-hashtag-picker.tsx` |
| `searchSunners` (Server Action) | tìm Sunner theo tên qua `profile_cards` | A2 | `_actions/search-sunners.ts` |
| `createKudo` (Server Action) | validate + upload ảnh + ghi Kudo mới | A4 | `_actions/create-kudo.ts`, `_actions/upload-kudo-images.ts` |
| `useKudosComposeForm`, `useKudosComposeDialog`, `useSunnerSuggest` | state machine form/dialog/gợi ý người nhận | A1, A3, A4 | `_hooks/use-kudos-compose-{form,dialog}.ts`, `_hooks/use-sunner-suggest.ts` |

### 4.2 Data Model

```mermaid
erDiagram
    KUDOS }o--|| PROFILE_CARDS : "receiver_id -> id"
    KUDOS {
        uuid id
        uuid sender_id
        uuid receiver_id
        text content
        text_array hashtags "phần tử 0 = Danh hiệu, 1..5 = hashtag chip"
        text_array image_urls "URL ảnh trong bucket kudo-images"
        boolean is_anonymous "cột mới"
        text anonymous_name "cột mới, nullable"
        timestamptz created_at
    }
    PROFILE_CARDS {
        uuid id
        text full_name
        text avatar_url
    }
```

| Entity | Table | Used for | Action |
|---|---|---|---|
| `Kudos` | `kudos` | Kudo mới được ghi khi Gửi thành công | A4 |
| `ProfileCard` | `profile_cards` *(view)* | Tìm và hiển thị Sunner làm người nhận | A2 |
| `KudosImage` | `storage.objects` *(bucket `kudo-images`, mới)* | Lưu file ảnh đính kèm | A4 |

#### Polymorphic Behavior

N/A — no discriminator fields in Key Entities.

### 4.3 State Management

**kind:** ui
**Linked FR:** FR-401
**Source:** `src/app/(public)/kudos/_hooks/use-kudos-compose-form.ts` (`submitting`/`submit`/`reset`)

### Trạng thái hiển thị của modal Viết Kudo (SM-001)
**kind:** ui
**Linked FR:** FR-101, FR-102
**Source:** `src/app/(public)/kudos/_hooks/use-kudos-compose-dialog.ts` (`isOpen`/`open`/`close`),
`_components/kudos-compose-launcher.tsx:56-167` (wiring); hành vi đã chốt tại
`functional-spec.md § 4` (FR-101, FR-102) và `screens/SCR008_KudosCompose/spec.md § UI States`.

```mermaid
stateDiagram-v2
    [*] --> Closed
    Closed --> Open : A1 bấm pill (đã đăng nhập)
    Open --> Submitting : A4 bấm Gửi (hợp lệ)
    Submitting --> Closed : A4 gửi thành công
    Submitting --> Open : A4 gửi thất bại (lỗi mạng/máy chủ)
    Open --> Closed : A1 Hủy / Escape / click nền
```

**Action transitions:** guard và side effect của mỗi cạnh nằm ở rung **Result** của action được
nêu trên cạnh đó (§ 3.1) — không lặp lại ở đây.

### 4.4 Shared Rules

#### Bin 3 — cross-cutting, belongs to no single action

**A0 · FR-601 — mọi hành động ghi dữ liệu đều yêu cầu phiên đăng nhập hợp lệ.**
Server Action tự `auth.getUser()` trước khi làm bất cứ điều gì khác — **áp dụng cho toàn bộ tính
năng**, không phải một action riêng lẻ. Cùng gate với `toggle-kudo-heart.ts:44-51`; không phải một
rule chỉ của feature này. Khi thất bại: trả `{ok:false, reason:"unauthenticated"}`, không ghi gì.
**Source:** `src/app/(public)/kudos/_actions/create-kudo.ts:99-106`,
`src/app/(public)/kudos/_actions/search-sunners.ts:59-66`

#### Bin 2 — used by ≥2 named actions

**BR-002 — Hashtag tối thiểu 1 (kể cả Danh hiệu), tối đa 5 chip.**
Used in: **A3** · **A4**. Client chặn thêm chip thứ 6 ngay tại UI; Server Action chặn lại lần nữa
nếu mảng hashtag rỗng khi submit — hai lớp kiểm tra CÙNG một hàm (`validateKudoDraft`, AD-8).
**Source:** `src/app/(public)/kudos/_utils/validate-kudo-draft.ts`
```text
if hashtags.length < 1: reject("Không được để trống")
if hashtags.length > 5: reject("Tối đa 5 hashtag")
```

**BR-003 — Ảnh tối đa 5 file, chỉ nhận `.jpg`/`.png`.**
Used in: **A3** · **A4**. Client ẩn nút "+ Image" khi đủ 5 và từ chối file sai định dạng tại bước
chọn; Server Action validate lại CÙNG hàm (`validateKudoImages`, AD-8) trước khi upload lên Storage.
**Source:** `src/app/(public)/kudos/_utils/validate-kudo-images.ts`
```text
if images.length > 5: reject("Tối đa 5 ảnh")
if not mimeType in [image/jpeg, image/png]: reject("Định dạng file không hợp lệ")
```

**BR-004 — Bật "Gửi ẩn danh" bắt buộc có tên ẩn danh.**
Used in: **A3** · **A4**. Checkbox bật thì lộ ô nhập tên; Server Action ghi `is_anonymous=true` kèm
tên đó. [NEEDS_DOMAIN_CONFIRMATION] hành vi khi tên ẩn danh để trống lúc submit đã CHỐT theo default
(chặn submit, D001 trong `functional-spec.md § 3`) — xem § 5.3.
**Source:** `src/app/(public)/kudos/_utils/validate-kudo-draft.ts`,
`src/app/(public)/kudos/_actions/create-kudo.ts:116-123`
```text
if isAnonymous and anonymousName.trim() == "": reject("Không được để trống") # mặc định, chưa xác nhận
```

### 4.5 Algorithms & Integrations

None.

### Tải ảnh đính kèm lên Supabase Storage (INT-001)

**Linked FR:** FR-206
**Used in:** A4
**Source:** `src/app/(public)/kudos/_actions/upload-kudo-images.ts`; bucket + policy tạo bởi
`supabase/migrations/0010_kudo_images_bucket.sql`, đã apply thành công trên instance local
(`plans/260907-2338-kudos-write-modal/evidence/migration-transcript.md § 5`).
**Type:** api-call
**Target:** Supabase Storage bucket `kudo-images` (`storage.buckets`, `public = true`; tạo bằng
migration SQL, KHÔNG qua `config.toml:114-120`'s khối `[storage.buckets.images]` — khối đó vẫn để
comment, không dùng).
**Payload:** tối đa 5 file ảnh `.jpg`/`.png`, mỗi ảnh gắn với kudo sắp tạo; đuôi file trong
Storage path (`${userId}/${randomUUID()}.${ext}`) suy từ MIME type, KHÔNG từ tên file người dùng.
**Failure handling:** CHỐT (AD-5) — upload TUẦN TỰ (không `Promise.all`); lỗi ở file thứ `k` →
best-effort `remove()` các file `0..k-1` đã lên rồi throw, KHÔNG insert `kudos`. Nếu upload xong hết
nhưng bước `insert` sau đó lỗi, `create-kudo.ts` gọi lại `removeKudoImages()` best-effort xoá toàn
bộ ảnh vừa upload trước khi trả lỗi — không bao giờ để lại một hàng `kudos` thiếu ảnh, và cũng không
để sót object mồ côi trong Storage ở đường thành công/thất bại đã biết.

### 4.6 Configuration

```text
KUDO_IMAGES_BUCKET = "kudo-images"   # tên bucket Supabase Storage cho ảnh đính kèm Kudo (A4)
                                      # hằng số thật: upload-kudo-images.ts:81 (singular "KUDO_",
                                      # không phải "KUDOS_" — sửa lại nhãn cho khớp code)
```

**Client behavior:** see
[`behavior-logic.md`](../../docs/generated/behavior-logic.md) (client-side patterns — debounce, optimistic UI, polling, upload, realtime),
[`permissions.md`](../../docs/system/permissions.md) (feature flags / experiments / env / locale gates),
[`architecture.md`](../../docs/system/architecture.md) (guards / deep-link state restoration / unsaved-changes protection).

## 5. Verification & Technical Notes

### 5.1 Technical Verification

- **SC-001** *(A4)* Gửi thành công → modal đóng và Kudo mới xuất hiện trên bảng `/kudos` (covers
  FR-401, BR-001)
- **SC-002** *(A4)* Thiếu ≥1 trong 4 trường bắt buộc → submit bị chặn, lỗi hiển thị đúng trường
  (covers FR-402, DEC-002)
- **SC-003** *(A3)* Thêm hashtag/ảnh vượt giới hạn → bị chặn (covers FR-403, FR-404, BR-002, BR-003)

#### US001_SendKudo *(A2, A4)*

**Independent Test:** Mở modal, chọn 1 recipient hợp lệ, điền danh hiệu/nội dung/1 hashtag, bấm
Gửi — xác nhận modal đóng và Kudo mới có mặt trên bảng.

**Acceptance Scenarios:**
1. **Given** đã đăng nhập và đã mở modal, **When** điền đủ 4 trường bắt buộc rồi bấm Gửi, **Then**
   modal đóng và Kudo mới xuất hiện trên bảng `/kudos`.
2. **Given** để trống bất kỳ trường bắt buộc nào, **When** bấm Gửi, **Then** trường đó hiện viền đỏ
   kèm thông báo lỗi, form không submit.

#### US002_ManageHashtags *(A3)*

**Independent Test:** Thêm lần lượt 5 hashtag rồi thử thêm thêm 1 cái nữa — xác nhận cái thứ 6 bị
chặn.

**Acceptance Scenarios:**
1. **Given** modal đang mở, **When** thêm 5 hashtag hợp lệ, **Then** cả 5 hiển thị dạng chip.
2. **Given** đã có 5 hashtag, **When** cố thêm hashtag thứ 6, **Then** hệ thống chặn và hiện "Tối
   đa 5 hashtag".

#### US003_AttachImages *(A3, A4)*

**Independent Test:** Upload 5 ảnh hợp lệ rồi thử thêm ảnh thứ 6 — xác nhận nút "+ Image" đã ẩn.

**Acceptance Scenarios:**
1. **Given** modal đang mở, **When** chọn 1 ảnh `.jpg`, **Then** ảnh hiển thị thumbnail kèm nút
   xoá.
2. **Given** chọn file `.pdf`, **When** cố upload, **Then** hệ thống từ chối và hiện lỗi định dạng.

#### US004_SendAnonymousKudo *(A3, A4)*

**Independent Test:** Bật checkbox ẩn danh, nhập tên ẩn danh, gửi — xác nhận `is_anonymous=true` và
tên ẩn danh được lưu.

**Acceptance Scenarios:**
1. **Given** modal đang mở, **When** bật checkbox "Gửi ẩn danh", **Then** ô nhập tên ẩn danh hiện
   ra.
2. **Given** đã bật ẩn danh và nhập tên, **When** bấm Gửi, **Then** Kudo được lưu với
   `is_anonymous=true` và tên ẩn danh tương ứng.

### 5.2 Assumptions

- *(A2)* Giả định danh sách gợi ý người nhận trả về đủ nhanh để dùng trực tiếp trong autocomplete
  mà không cần debounce riêng — số Sunner trong hệ thống được giả định nhỏ (nội bộ công ty), chưa
  xác nhận bằng benchmark thật. **Kết quả implement**: giả định SAI ở chi tiết debounce — implementer
  vẫn thêm debounce 250ms (AD-6, `use-sunner-suggest.ts`), lý do là tránh gọi Server Action mỗi
  keystroke (không phải vì tốc độ phản hồi), không phải vì số Sunner lớn.
- *(A4)* Giả định upload ảnh và insert `kudos` chạy tuần tự trong cùng một Server Action (không
  phải job nền) — phù hợp với việc repo hiện không có hạ tầng queue nào. **Đúng như giả định**:
  `createKudo` upload tuần tự (`for` loop, không `Promise.all`) rồi mới insert (AD-5).
- *(A1)* Giả định trạng thái đăng nhập được Server Component trang `/kudos` truyền xuống pill dưới
  dạng prop có sẵn — chưa xác nhận `page.tsx` hiện đã truyền prop này hay cần thêm khi implement.
  **Đúng một phần**: `isSignedIn` được TÍNH MỚI ở `kudos-client.tsx` (`viewerId !== null`, `viewerId`
  vốn đã có sẵn từ `page.tsx`) rồi truyền qua `kudos-screen.tsx` → `kudos-keyvisual-band.tsx` →
  `kudos-compose-launcher.tsx` — không phải một prop có sẵn từ trước, nhưng dữ liệu gốc (`viewerId`)
  đúng là đã có sẵn như giả định.

### 5.3 Unresolved Questions (đã chốt khi implement)

1. **Xử lý lỗi upload ảnh giữa chừng** *(A4)*: khi upload thành công 2/5 ảnh rồi ảnh thứ 3 lỗi
   mạng, có rollback (xoá 2 ảnh đã lên) hay giữ nguyên và chỉ báo lỗi chung? **Đã chốt (AD-5)**:
   rollback — best-effort `remove()` các ảnh đã lên rồi trả lỗi, KHÔNG insert `kudos`
   (`upload-kudo-images.ts`).
2. **Debounce cho ô tìm kiếm người nhận** *(A2)*: có cần debounce (và giá trị ms) trước khi gọi
   Server Action mỗi lần gõ, hay gọi ngay mỗi keystroke? **Đã chốt (AD-6)**: debounce 250ms, tối
   thiểu 1 ký tự trước khi gọi (`use-sunner-suggest.ts`).
3. **Tên ẩn danh rỗng khi Gửi** *(A4)*: hành vi cụ thể chưa được xác nhận — xem Open Decision D001
   trong functional-spec.md. **Đã chốt**: giữ default của spec — chặn submit, báo lỗi tại ô tên ẩn
   danh (không có design nào phủ nhận default này khi implement).

### 5.4 Source References

Code triển khai đầy đủ, xem citation theo từng action ở § 3.1 và § 4. Tóm tắt theo nhóm:

- **Migration**: `supabase/migrations/0009_kudos_write_anonymity.sql` (cột ẩn danh + policy
  `kudos_insert_own` + patch view), `supabase/migrations/0010_kudo_images_bucket.sql` (bucket +
  2 policy `storage.objects`).
- **DAL**: `src/dal/sunner-search.ts`, `src/dal/sunner-search-client.ts`.
- **Server Actions**: `_actions/create-kudo.ts`, `_actions/upload-kudo-images.ts`,
  `_actions/search-sunners.ts`.
- **Hooks**: `_hooks/use-kudos-compose-{dialog,form}.ts`, `_hooks/{kudos-compose-draft,
  kudos-compose-form-rules,use-kudos-compose-attachments,use-kudos-compose-content,
  use-sunner-suggest}.ts`.
- **Utils**: `_utils/validate-kudo-{draft,images}.ts`, `_utils/insert-markdown-marker.ts`,
  `_utils/parse-kudo-markdown.ts`.
- **Components**: toàn bộ `_components/kudos-compose-*.tsx` + field/toolbar/picker components
  liệt kê ở § 4.1; `kudos-compose-pill.tsx` (sửa lại), `kudos-card.tsx`/`kudos-card-person.tsx`
  (F007, sửa để đọc `sender.id === null` và gọi `KudoMarkdownText`).
- **Test**: `tests/e2e/kudos-compose.spec.ts` (27/27 GREEN,
  `plans/260907-2338-kudos-write-modal/evidence/green-evidence.md`).

#### Data Flow

```text
{payload form} -> createKudo validate -> Storage upload (nếu có ảnh) -> insert kudos -> revalidate /kudos
```

### 5.5 Artifact References

| Artifact | File | Codes Used | Reviewed |
|----------|------|------------|----------|
| System Overview | [system-overview.md](../../docs/system/system-overview.md) | TBD (draft) — overview.md chưa reconcile F007-F009, ngoài phạm vi phiên này | [ ] |
| Architecture | [architecture.md](../../docs/system/architecture.md) | § "Bổ sung dự kiến — F009_KudosCompose" (đã reconcile với as-built) | [ ] |
| Feature List | [feature-list.md](../../docs/generated/feature-list.md) | F009 | [ ] |
| API Map | [api-map.md](../../docs/generated/api-map.md) | `createKudo`, `searchSunners` (Server Actions, không phải ROUTE###) | [ ] |
| Entities | [entities.md](../../docs/generated/entities.md) | KUDOS_KudosCard (mở rộng — 2 cột ẩn danh + view patch) | [ ] |
| Screens | [functional-spec.md § 6](./functional-spec.md#6-screens) | SCR008_KudosCompose | [ ] |
| Behavior Logic | [behavior-logic.md](../../docs/generated/behavior-logic.md) | Không có BL### mới — dùng lại BL002_SupabaseServerClient | [ ] |
| Permissions Matrix | [permissions-matrix.md](../../docs/generated/permissions-matrix.md) | Chưa cấp PERM### riêng — xem § `/kudos` (F009_KudosCompose) | [ ] |
| User Stories | [user-stories.md](../../docs/generated/user-stories.md) | US001, US002, US003, US004 | [ ] |
