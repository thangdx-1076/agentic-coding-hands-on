---
title: "F006_ProfilePage bản tự khai tri khi MoMorph chưa có Kudos domain, privilege escalation SECURITY DEFINER, vacuous tests hoặc sai ứng dụng, fixture NULL vĩnh viễn, 31 file promote"
date: 2026-09-07
time: "12:24 → 15:30"
tags: [momorph, e2e-red-first, security, supabase, next16, profile, track-a+b, spec-deferral]
severity: high
---

# Tóm tắt

F006_ProfilePage `/profile` auth-gated (MoMorph screen `3FoIx6ALVb`). `profile.spec.ts` RED 18/22 → GREEN 22/22 qua 8 phase + e2e-red-first. 81 regression passed / 3 skipped, 175 unit tests @100% allowlist, lint/format/typecheck/build clean, reviewer 8.5/10 SEALED. Quyết định then chốt: MoMorph test cases giả định Kudos domain **không tồn tại** (bảng, route, modal, keyset) → ship `/profile` khác cơ bản system hiện tại, render deferred state cho 10/30 TC. Bảo mật: view SECURITY DEFINER bị lộ auto-updatable-write mở cho `authenticated` (không phải chỉ `anon` như plan) — sửa rộng REVOKE, xác nhận DROP+re-apply. Test: C12 kiểm property vô hình, C16 register sau `goto`, C10 không kích dropdown, visual pass lái nhầm app khác. Dữ liệu: sign-in metadata lệch khiến trigger fixture NULL, poisoned vĩnh viễn `ON CONFLICT`. Scope: promote 31 file chrome `(public)/_*` → `src/app/_*` chưa kế hoạch.

---

## Spec ở thế giới khác — Kudos domain không hề tồn tại

### Vấn đề
30 test case MoMorph giả định:
- Bảng `kudos`, `hearts`, `anonymous_senders` → không có
- Route `/kudos` + card feed keyset cursor → không route
- "Viết Kudo" modal + action `openProfile` → không component
- `profiles.department`, tier hero, hoa-thị stars → không cột trên `users`
- `locales/{vi,en}/profile.json` → repo dùng next-intl `messages/`

**Quyết định: ship `/profile` khác system hiện tại, 18/30 TC hiện làm được, 10/30 hoãn đến F007+ (Kudos domain).**

### Tại sao bị chấp nhận
1. Spec F005 cũng tự hoãn Secret Box cùng lý lẽ: "render trạng thái deferred thay vì số giả"
2. `/standards` ship link `<a href="/kudos">` có DOM contract ghi "target 404" — nên phép `?id=` vào route 404 là đã quen
3. Ít thay đổi file nhất (CLAUDE.md rule c): dùng đúng gì còn ≈ mạnh hơn tạo schema giả

Học được: **spec viết trước hệ thống là thương lượng scope, không phải thứ tự xây**. Đọc lại "30 TC" như "đây là những gì có thể làm ngay" + "đây là những gì chặn ở đâu" — xem xét rồi chốt trước khi code.

---

## Lỗi bảo mật view SECURITY DEFINER: auto-updatable, authenticated DML không chỉ anon

### Quy trình phát hiện

Migration 0005 thêm view SECURITY DEFINER để `/profile?id=<other>` đọc qua RLS. Plan yêu cầu:
```sql
REVOKE ALL ON public.profile_cards FROM anon, PUBLIC
GRANT SELECT ON public.profile_cards TO authenticated
```

**Nhưng:** Supabase `pg_default_acl` tự động grant `INSERT`/`UPDATE`/`DELETE` cho `authenticated` trên mọi object mới ở `public`. Vì view này là đơn-bảng-gốc, PostgreSQL coi nó auto-updatable — ghi through nó sẽ bypass RLS và chạy với BYPASSRLS của owner → **bất kỳ authenticated Sunner nào cũng ghi đè `full_name`/`avatar_url` của ai cũng được**.

### Sửa & xác nhận

Commit cho phép: `REVOKE` mở rộng bao gồm `authenticated`:
```sql
REVOKE ALL ON public.profile_cards FROM anon, PUBLIC, authenticated
GRANT SELECT ON public.profile_cards TO authenticated
```

**Xác nhận bằng thực hành, không phải truyền thuyết:**
- Migration ran nên `supabase migration up` report "up to date" (track by version, không hash)
- Hand-patch DB để bypass lệnh skip
- Sau đó DROP view, apply file committed từ scratch → xác minh `information_schema.role_table_grants` CHÍNH XÁC
- Probe runtime (PostgREST): anon read/write 401, authenticated write 403 ✓

**Bài học gắt:** `supabase migration up` bỏ qua file đã chạy dù nội dung sửa. Commit không phải DB là real. Re-run từ chân bảo đảm thật.

---

## Ba test tưởng xanh nhưng không thể đỏ

### C12 — kiểm tính năng vô hình

```typescript
// Cũ (vacuous):
const requests = (page.context() as any).recordedRequests || []
expect(requests.length).toBe(0)
```

`page.context()` không có property `recordedRequests` — Playwright không track request thế này. Test luôn length=0, không theo dõi được.

**Sửa:** `/profile?id=` dùng `@/lib/supabase/server`, server-side — không có request nào qua browser boundary để Playwright đo. Xoá nửa vacuous của C12, giữ `tests/unit/parse-profile-id.test.ts` với coverage đầy đủ.

### C16 — listener dính muộn

```typescript
page.on("response", ...assertion...)
await page.goto("/")  // Response đã gửi, listener chưa dính
```

Test nó trông xanh nhưng không bao giờ thấy response — response/HTML luôn có raw UUID trong flight payload, DOM hiển thị cắt ra. Xác nhận lại bằng cách assert trên visible text thay vì HTML toàn bộ.

### C10 — dropdown không kích

Dom contract: "chọn chiều → hiện copy tương ứng". Test không bao giờ mở dropdown:
```typescript
// Claim to test direction switch but:
expect(page.getByText(/chưa có|không có/i)).toBeVisible()
// That's it — which direction is active? Hardcode "received"?
```

Fix (per reviewer M1): `click()`, `getByRole("option", { name: /Đã gửi/ })`, `click()`, rồi assert copy đổi.

**Học được:** Test xanh không có nghĩa gì nếu nó không thể đỏ. Audit: có hành động nào sẽ làm nó fail không?

---

## Visual validation lái nhầm ứng dụng — reuseExistingServer giữ server cũ

### Kịch bản

Playwright chạy visual pass 6 PNG. Tất cả byte-giống nhau (?), kiến trúc file khác.

**Nguyên nhân:** Dự án khác (AIMO Parking, Next v14) giữ dev server ở :3000. `playwright.config.ts` có `reuseExistingServer: !process.env.CI` → lúc locally, Playwright không start server mới, dùng lại cái cũ → drove app Parking's 404, không `/profile`.

**Tell:** 6 PNGs MD5 byte-identical. Không thể xảy ra cho 2 view khác nhau.

**Fix:** `playwright.config.ts` accept `E2E_PORT` env:
```typescript
baseURL: `http://localhost:${process.env.E2E_PORT || 3000}`
```

Gọi `E2E_PORT=3100 pnpm test:e2e` → Playwright start server mới ở 3100.

---

## Fixture NULL vĩnh viễn — metadata payload lệch khiến trigger fail

### Khai phá

Test fixture sign-in qua `signInWithOAuth`, kiềm chế kèm `raw_user_meta_data`:
```typescript
// Cũ (GoTrue SDK):
options: { data: { full_name: "Alice" } }
```

GoTrue REST không hiểu SDK concept `options` — POST payload không có `data` nested → chỉ có `{}` về.

Migration 0002 trigger:
```sql
ON CONFLICT (id) DO NOTHING,
UPDATE SET full_name = new.raw_user_meta_data->>'full_name'
```

Vì `raw_user_meta_data = {}`, trigger set `full_name = NULL`. Vì `ON CONFLICT DO NOTHING`, signup thứ hai để nguyên NULL — **fixture bị độc vĩnh viễn**.

**Sửa:** payload top-level:
```typescript
data: { full_name: "Alice" }  // ← Post body, không nested
```

Chứng minh empirically probe đúng lúc trước + sau fixture delete.

**Bài học cay:** constraint `ON CONFLICT DO NOTHING` là lưới an toàn cho _idempotency_, thành cơn dò lỗi nếu mutation data. Lần sau fixture setup kiểm raw_user_meta_data trước assert.

---

## Scope ẩn: 31 file promote chrome (public) → root

### Kế hoạch bỏ qua

Plan để `/profile` dùng chrome từ `(public)`: `SiteHeader`, `SiteFooter`, `useSelectLocale` ở `(public)/_components/` (anh em của `/login`). Nhưng:
- `/profile` ở `(protected)` — khác route group
- Import ngang giữa route groups = anti-pattern (F005 đã xử lần trước bằng promote `IconPencil`)
- Tổ tiên chung: `src/app/`

**Sửa:** promote toàn bộ chrome `(public)/_*` lên `src/app/_*` (1 sửa duy nhất: import path `../`). Phát hiện 31 file, không phải 9 như plan liệt.

### Kiểm cất tài

`git diff -M` (rename detection) không phải stat summary:
- `icon-pencil.tsx`: pure move + import update ✓
- 15 consumer `(public)/**`: relative path fix chỉ (`../` count thêm) ✓
- `award-name-graphics.ts` NOT promoted (award-card-specific, không shared) ✓
- `_shared/` giữ 1 file, xoá 3 ✓

---

## Kết quả

| Command | Kết quả |
|---------|---------|
| `pnpm test:e2e tests/e2e/profile.spec.ts` | 22/22 pass ✓ |
| `pnpm test:e2e` (tất cả) | 81 pass, 3 skip ✓ |
| `pnpm test:unit:coverage` | 175 tests, 100% ✓ |
| `pnpm lint --max-warnings 0` | exit 0 ✓ |
| `pnpm typecheck` | exit 0 ✓ |
| `pnpm build` | exit 0 ✓ |
| Reviewer | 8.5/10 SEALED ✓ |

---

## Quyết định ghi lại

1. **Spec deferral:** 10 TC hoãn (Kudos domain F007+) vì thiếu subsystem, 18/30 làm được. Deferred state = deserted state đã có trong spec, không phải cách chối.
2. **RLS breach:** view auto-updatable muốn `authenticated` REVOKE, không chỉ `anon`. Commit = truth.
3. **Test honesty:** vacuous test ≠ test pass. Audit cho assertion có thể đỏ.
4. **Port squatter:** `reuseExistingServer` dính cũ nếu port khác. Env override.
5. **Metadata poison:** `ON CONFLICT DO NOTHING` giữ NULL forever. Kiểm schema trước fixture.
6. **Scope creep ngầm:** "dùng shared component" → "promote 31 file". Đo cây phụ thuộc đủ.

---

## Còn mở

1. **10 TC hoãn** — Kudos domain (tên bảng, endpoint, i18n, keyset): F007
2. **3 chuỗi copy chưa review design** — `profile.hero.fallbackName` "Sunner", `profile.kudos.empty{Received,Sent}` ("chưa có")
3. **Department/tier/stars column** — không có trên `users` → hero bỏ hẳn những dòng
4. **Visual baseline** — 2 PNG hiện tại chỉ eyeball, không pixel-diff tự động
5. **CI chỉ chạy 1/22 test** — @auth tag bị loại ra, chứng minh thật chỉ local + Supabase

---

**Evidence**: 8 phase, Track A+B parallel, tester + reviewer; `/plans/260907-1224-profile-page/` (spec/clarifications/security-verify/known-limits); commits 6485186–cad5bed; `git log --oneline origin/main..HEAD`; reviewer 8.5/10 SEALED; 22/22 e2e, 81 regression, 175 unit @100%.

**Status:** DONE
**Summary:** F006 `/profile` auth-gated (MoMorph 3FoIx6ALVb) built. RED 18/22 → GREEN 22/22; e2e 22/22, regression 81/84, unit 175 @100%; lint/typecheck/build/format clean; reviewer 8.5/10 SEALED. Spec defer Kudos domain (10/30 TC hoãn), migration 0005 escalation (authenticated auto-updatable write) + xác nhận DROP+reapply, 3 vacuous test → fixed/deleted, visual pass lái app khác (E2E_PORT override), metadata poison NULL fixture (payload nesting sai), 31 file promote (chrome common ancestor).
**Concerns:** None critical. Known: 10 TC deferred, 3 copy strings unreviewed-design, no pixel baseline, CI ≈useless (1/22 @auth). Mitigate: local Supabase + E2E_PORT.

**Journal path:** `/Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on/docs/journals/260907-1224-profile-page-momorph-e2e-red-first.md`
