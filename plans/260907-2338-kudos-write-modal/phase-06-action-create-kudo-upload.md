---
phase: 06
feature: F009
track: B
status: completed
priority: P1
test_policy: e2e-red-first
effort: 1.5h
owner: implementer
file_ownership:
  [
    "src/app/(public)/kudos/_actions/create-kudo.ts",
    "src/app/(public)/kudos/_actions/create-kudo.test.ts",
    "src/app/(public)/kudos/_actions/upload-kudo-images.ts",
    "src/app/(public)/kudos/_actions/upload-kudo-images.test.ts",
    "next.config.ts",
  ]
---

# Phase 06 — Server Action `create-kudo` + upload ảnh lên Storage

## Context Links

- `src/app/(public)/kudos/_actions/toggle-kudo-heart.ts:1,39,44-51,56,89` — khuôn phải theo **từng bước**: `"use server"` đầu file → validate tay → `createClient()` + `auth.getUser()` fail-closed → insert → `revalidatePath(ROUTES.KUDOS)`; và `toggle-kudo-heart.test.ts:15,36-90` cho cách mock
- `phase-04` cấp `validateKudoDraft`, `validateKudoImages`, `MAX_KUDO_IMAGE_BYTES` — **import, không viết lại**
- `phase-02` cấp policy `kudos_insert_own`, 2 cột ẩn danh, bucket `kudo-images`
- `spec/system/permissions.md` § "Fail-open cho ĐỌC, fail-closed cho GHI" · `spec/system/architecture.md` § ADR upload
- **Docs Next bundled**: `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md` — mở file này trước khi sửa `next.config.ts`
- FR-001, FR-002, FR-201, FR-208, FR-401, FR-402, FR-601 · BR-001..BR-004, BR-006, DEC-002 · A0, A4, INT-001 · plan.md AD-4, AD-5

## Overview

**Priority**: P1 · **Track B** (`implementer`) · **Goal**: đường GHI đầu tiên vào `public.kudos` — xác thực lại phía máy chủ, validate lại bằng đúng hàm client dùng, upload xong hết ảnh rồi mới INSERT, rồi `revalidatePath`.

## Architecture notes

```text
FormData → auth.getUser() (fail-closed) → validateKudoDraft + validateKudoImages
  → uploadKudoImages() lần lượt ≤5 file → mảng public URL
  → INSERT public.kudos { sender_id, receiver_id, content, hashtags: [title, ...chips],
                          image_urls, is_anonymous, anonymous_name }
  → revalidatePath(ROUTES.KUDOS) → { ok: true, kudoId }
```

- Kiểu trả về là discriminated union đúng khuôn `toggle-kudo-heart.ts:11-13`: `{ ok: true; kudoId: string } | { ok: false; reason: "unauthenticated" | "invalid"; errors?: KudoDraftErrors } | { ok: false; reason: "error" }`. Không throw ra khỏi hàm export; một `try/catch` ngoài cùng.
- **`hashtags[0]` là Danh hiệu** (BR-001) — server tự ghép `[title.trim(), ...chips]`, không tin client gửi mảng đã ghép.
- `upload-kudo-images.ts`: hàm thường (không `"use server"`), nhận client Supabase **injected** + danh sách file; path `${userId}/${crypto.randomUUID()}.${ext}` (ext suy từ mime, **không** từ tên file người dùng); `contentType` đặt tường minh; trả `{ urls, uploadedPaths }`. Lỗi ở file thứ k → best-effort `.remove(uploadedPaths)`, lỗi dọn bị nuốt, ném/trả lỗi gốc lên (AD-5).
- `next.config.ts`: `experimental.serverActions.bodySizeLimit = "28mb"` — 5 file × 5 MiB ≈ 26.2 MB cộng overhead multipart (docs khuyên chừa 10–20 KB). **Xác nhận key bằng docs bundled trước khi gõ.** Nếu docs của bản này nói key khác hoặc không tồn tại → **BLOCKED**, báo lại, đừng đoán và đừng tự chuyển sang upload từ browser (đó là quyết định phải ghi vào `clarifications.md` trước, xem § "5 ảnh đi qua Server Action").
- Dùng **đúng một** client: `createClient()` của `@/lib/supabase/server` cho cả Storage và INSERT — không tạo client Storage riêng, không service-role (repo không có, và không thêm ở đây).

## Implementation Steps

1. Mở file docs Next ở § Context Links, xác nhận `experimental.serverActions.bodySizeLimit` và định dạng chuỗi; ghi một dòng kết luận vào `plans/action-items.md` § Decisions.
2. Test trước cho `upload-kudo-images.test.ts`: 0 file → `{ urls: [], uploadedPaths: [] }` và **không** gọi Storage; 3 file OK; file thứ 3 lỗi → `.remove()` được gọi với đúng 2 path đã lên và hàm báo lỗi.
3. `upload-kudo-images.ts` theo § Architecture.
4. Test trước cho `create-kudo.test.ts`: chưa đăng nhập → `{ok:false, reason:"unauthenticated"}` và **không** gọi Storage lẫn `.insert` (FR-601, ID-1); thiếu 1 trong 4 trường → `{ok:false, reason:"invalid", errors}` và không ghi gì (ID-56); 6 hashtag → `invalid`; file `.txt` → `invalid`; happy path → `.insert` nhận `hashtags[0] === title`, `is_anonymous` đúng, rồi `revalidatePath(ROUTES.KUDOS)`; RLS từ chối (`error` từ Supabase) → `{ok:false, reason:"error"}`; upload lỗi → **không** có `.insert` nào.
5. `create-kudo.ts`: đọc `FormData` (`getAll("images")`), gọi `validateKudoDraft`/`validateKudoImages` của phase 04, rồi các bước § Architecture.
6. `next.config.ts`: thêm khối `experimental.serverActions`, giữ nguyên `withNextIntl(...)`.
7. `pnpm exec vitest run "src/app/(public)/kudos/_actions"` → `pnpm test:unit:coverage` → `pnpm build` → `pnpm typecheck`.

## Todo List

- [ ] Đọc docs Next xác nhận key `bodySizeLimit` trước khi sửa config
- [ ] `auth.getUser()` chạy **trước** mọi thứ khác, fail-closed
- [ ] Validate lại ở server bằng đúng hàm phase 04, không viết lại luật
- [ ] `hashtags = [title, ...chips]` ghép ở server (BR-001)
- [ ] Upload hết ảnh rồi mới INSERT; lỗi → best-effort `remove()`, không INSERT (AD-5)
- [ ] Path file dùng `randomUUID` + ext suy từ mime, không dùng tên file người dùng
- [ ] `revalidatePath(ROUTES.KUDOS)` chỉ ở nhánh thành công
- [ ] coverage 100% trên 2 file action · build · typecheck · lint · format

## Success Criteria

- `pnpm test:unit:coverage` xanh, 2 file mới 100%.
- Test chứng minh nhánh `unauthenticated` **không** chạm Storage và **không** chạm `.insert` — assert trên spy, không chỉ trên giá trị trả về.
- Test chứng minh upload lỗi giữa chừng → `.remove()` được gọi và `.insert` **không** được gọi.
- `grep -rn "service_role\|SERVICE_ROLE" src/` vẫn rỗng.
- `pnpm build` + `pnpm typecheck` xanh với `next.config.ts` mới; `pnpm dev` khởi động không warning về `experimental`.
- Mỗi file ≤200 dòng.

## Risk Assessment

| Rủi ro | KN | AH | Countermeasure |
|---|---|---|---|
| Đoán tên key config Next (bản này middleware là `proxy.ts`, không chuẩn) | Cao | Cao — build đỏ hoặc giới hạn không có hiệu lực | Bước 1 bắt đọc docs bundled; đường dẫn đã ghi ở Context Links |
| 5 ảnh vượt body limit → action chết trước khi chạy dòng đầu | Cao | Cao — ID-18..24 không bao giờ xanh | Cap 5 MiB/file ở **cả hai** phía + `bodySizeLimit: "28mb"` |
| INSERT trước, vá ảnh sau | TB | Cao — hàng kudos thiếu ảnh vĩnh viễn | AD-5 + test bước 4 (không `.insert` khi upload lỗi) |
| Tin `hashtags` client gửi (đã ghép) | TB | Cao — `hashtags[0]` không còn là Danh hiệu, thẻ hiện sai tiêu đề | Server tự ghép; test assert `hashtags[0]` |
| Dùng tên file người dùng làm path Storage | TB | Cao — path traversal / trùng tên / ký tự lạ | `randomUUID()` + ext từ mime |
| Ảnh mồ côi khi upload lỗi | Cao | Thấp | Best-effort `remove()`; lỗi dọn bị nuốt, không che lỗi gốc |

## Security Considerations

Đây là gate bảo mật **duy nhất có giá trị** của feature (permissions.md § "Vì sao `/kudos` KHÔNG vào `src/proxy.ts`"): route công khai, pill chỉ là UX, nên một request gọi thẳng action phải bị chặn ở đây. Bốn điều cứng: (1) `auth.getUser()` trước tiên, fail-closed, không tin `sender_id` từ client — lấy từ session; (2) validate lại toàn bộ ở server, kể cả mime ảnh, vì client kiểm được thì client cũng bỏ qua được; (3) không service-role, không client mới — cùng client cookie-based đã INSERT; (4) `reason` trả về là enum, không bao giờ đẩy message lỗi thô của Postgres ra client.

## Next Steps

Mở khoá phase 07 (hook gọi action này) và phase 13 (truyền action xuống form).
