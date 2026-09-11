---
title: "Google avatar crash /kudos — cùng một failure mode lần thứ hai, vì list nằm trong config không ai gate được"
date: 2026-09-11
time: "00:19 → 00:40"
tags: [bug-fix, next-image, remote-patterns, config-testability, regression-prevention, kudos, profile]
severity: high
---

# Tóm tắt

Dropdown tìm kiếm Sunner trong compose dialog `/kudos` crash khi gặp Sunner có avatar Google:

```
Invalid src prop (https://lh3.googleusercontent.com/a/ACg8ocJvlheROXlldPmduJrQplSLqoAAtwEDlGFO4_qBpJqDJ51kvcWc=s96-c)
on `next/image`, hostname "lh3.googleusercontent.com" is not configured under images in your `next.config.js`
```

Throw ở `src/app/(public)/kudos/_components/kudos-sunner-options.tsx:87`. `next/image` throw **đồng bộ tại render** khi host không có trong `images.remotePatterns` — crash cả trang, không phải ảnh lỗi.

Sửa: thêm host avatar Google vào allowlist, và dời cả list ra `src/configs/image-remote-patterns.ts` để test chạm được. Bỏ workaround `<img>` ở `profile-hero.tsx`. 27 test mới, gate coverage 100% giữ nguyên. Reviewer `SEALED` (score 9, 0 critical, 1 Medium + 1 Low).

---

## Rễ — app có 2 remote image origin, config chỉ liệt kê 1

- **Origin 1**: Supabase Storage (ảnh kèm kudo), host suy từ `NEXT_PUBLIC_SUPABASE_URL`.
- **Origin 2**: avatar Google. `public.users.avatar_url` được `supabase/migrations/0002_handle_new_user_trigger.sql:19` ghi **nguyên văn** từ `raw_user_meta_data ->> 'avatar_url'` của Google identity → `https://lh3.googleusercontent.com/a/...`.

`next.config.ts` chỉ sinh pattern cho origin 1. Bốn nơi render đọc cột `avatar_url`: `kudos-sunner-options.tsx`, `kudos-card-person.tsx`, `kudos-leaderboard.tsx` (qua `_shared/build-gift-recipient-items.ts`), và `profile-hero.tsx`.

## Cùng một failure mode, lần thứ hai

`docs/vi/system/architecture.md` mục F009 đã ghi lần đầu: ảnh Supabase Storage crash `/kudos` vì đúng cơ chế này, phát hiện lúc implement chứ không phải suy đoán. Lần đó fix bằng cách thêm origin 1 vào config.

Giữa hai lần, bug này **đã được biết mà để nguyên**. `profile-hero.tsx` (phase-05) mang comment:

> `remote avatar host has no next.config images.remotePatterns entry yet; a plain <img> is used on purpose — next.config.ts is not owned by this phase`

Tức là: nhận ra thiếu entry, né tại chỗ bằng `<img>` + `eslint-disable @next/next/no-img-element`, và để ba nơi còn lại vẫn dùng `next/image` trên đúng cột đó. Ranh giới ownership theo phase là lý do hợp lý để không sửa lúc ấy — nhưng không có gì ghi lại rằng nợ đó vẫn còn sống.

**Vì sao không có gate**: pattern list nằm inline trong `next.config.ts` dưới dạng hàm local không export. Không test nào assert được "với env này thì list ra gì", cũng không có gì assert "host X có trong list chưa". Không phải vì vitest không import nổi file config — nó import được, test wiring trong bản fix này làm đúng việc đó. Vấn đề là **logic không có bề mặt để test bám vào**, nên không ai dựng gate, nên lỗi về lại theo một origin khác.

---

## Đã làm gì

**NEW `src/configs/image-remote-patterns.ts`** (185 dòng)

- `resolveImagesRemoteConfig(supabaseUrl?)` → `{ remotePatterns, dangerouslyAllowLocalIP }`. Nhận URL qua tham số, default đọc `process.env.NEXT_PUBLIC_SUPABASE_URL` → test được từng input mà không phải xoay env.
- `OAUTH_AVATAR_PATTERNS`: 2 pattern `lh3.googleusercontent.com`, `pathname` bó `/a/**` và `/a-/**` (avatar hiện hành + path legacy), **không** `**` trần — Photos/Drive thumbnail cùng host vẫn bị chặn khỏi image optimizer.
- `search` để trống có chủ ý: suffix size `=s96-c` nằm trong PATH, pin `search: ""` là tự mở lại đúng crash này khi Google thêm query param.
- Pattern avatar **không** phụ thuộc `NEXT_PUBLIC_SUPABASE_URL` — biến đó thiếu/hỏng không được kéo avatar theo.

**NEW `src/configs/image-remote-patterns.test.ts`** (27 test)

- Assert qua **matcher thật của Next** (`next/dist/shared/lib/match-remote-pattern`, hàm `hasRemoteMatch` — chính hàm `next/image` gọi trước khi throw), không tự viết lại luật wildcard. Pass được test này là pass được `next/image`.
- Một test import `next.config.ts` thật để chứng minh list **được wire vào**, không chỉ tồn tại rời. Đây đúng là lỗ mà unit test thuần để hở: module đúng nhưng không ai gọi.
- `src/configs/**` vốn đã nằm trong allowlist coverage của `vitest.config.ts` → module mới rơi thẳng vào gate 100% có sẵn, không phải thêm luật mới.

**MODIFIED `next.config.ts`** — từ ~151 dòng còn ~45, chỉ gọi `resolveImagesRemoteConfig()` rồi gán vào `images`. `bodySizeLimit: "28mb"` vẫn ở đây, không đổi. Vẫn `export default withNextIntl(nextConfig)`.

**MODIFIED `src/app/(protected)/profile/_components/profile-hero.tsx`** — bỏ `<img>` + `eslint-disable`, về `next/image`.

**MODIFIED 2 story file** (`profile-hero.stories.tsx`, `profile-screen.stories.tsx`) — fixture avatar từ `i.pravatar.cc` sang asset local trong `public/kudos/`. Component giờ render qua `next/image` nên host bên thứ ba sẽ bị chặn khi xem story; không thêm host của story vào allowlist production. `build-storybook` chỉ compile chứ không render, nên nó không đỏ vì việc này — đây là sửa để story còn xem được, không phải để gate xanh.

---

## Ba chuyện sai dọc đường — ghi đúng vì đó là phần dùng được

1. **Test regression đầu tiên của tôi có bug, không phải finding.** Viết `it.each` truyền `undefined` để giả lập thiếu env var. Nhưng hàm có default param (`supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL`) — `undefined` kích hoạt default và đọc env, test fail vì lý do khác hẳn. Sửa: `""` cho case falsy, `vi.stubEnv(..., undefined)` cho case unset thật. **Bài học**: có default param thì không thể dùng `undefined` qua argument để test trạng thái "vắng mặt".

2. **Test bắt một bug có sẵn chưa ai gặp.** `new URL("http://[::1]:55321").hostname` trả `"[::1]"` **kèm ngoặc vuông**, nên nhánh `hostname === "::1"` trong `isLoopbackOrPrivateHostname` chưa từng chạy đúng — `dangerouslyAllowLocalIP` sẽ sai nếu ai trỏ Supabase local qua IPv6 literal. Ẩn vì local dev đang dùng `127.0.0.1`. Sửa: strip ngoặc trước khi so.

3. **Reviewer sửa một claim tôi viết trong comment.** Tôi ghi allowlist "complete for the data the database can actually hold" vì không app path nào ghi `avatar_url`. **Sai.** `supabase/migrations/0001_users_table.sql:59` grant `UPDATE (avatar_url)` cho `authenticated` trên row của chính mình → một Sunner PATCH thẳng qua PostgREST là đặt được string bất kỳ, không qua app code, và người XEM row đó ăn đúng cái throw vừa fix. Tôi tự đọc lại SQL để kiểm chứ không tin ngay review, rồi viết lại comment nói rõ phần hở còn lại: mở rộng allowlist là câu trả lời sai (nó chính là thứ chặn optimizer fetch host tùy ý), thứ chứa được là `CHECK` constraint trên cột hoặc `error.tsx` bao route — cả hai đều chưa có và đều ngoài phạm vi bug fix này. Đã ghi thành việc cần quyết trong `plans/action-items.md`.

---

## Bằng chứng

- **Baseline trước khi sửa**: test dùng `hasRemoteMatch` của Next đối chiếu config thật trả `false` cho đúng URL trong ảnh báo lỗi → `expected false to be true`.
- **`/_next/image` trên dev server**: URL avatar Google chuyển từ `"url" parameter is not allowed` (đúng nguyên nhân crash) sang `"url" parameter is valid but upstream response is invalid`. Host không allowlist (`i.pravatar.cc`) vẫn `"url" parameter is not allowed` — allowlist không bị nới rộng.
- **Trên trình duyệt thật**: seed một `avatar_url` host Google vào Supabase local (`docker exec supabase_db_saa-app psql`), load `/kudos` — card render bình thường, **0 lỗi `Invalid src prop`**, chỉ một 400 broken-image vì avatar id là giả. Seed đã revert.
- **6 lệnh chạy lại xanh** (exit 0, dựng bằng `buildTemperResults`, không phải tự khai): `pnpm run typecheck`, `pnpm lint --max-warnings 0`, `pnpm run format:check`, `pnpm run test:unit:coverage` (90 file, 882 test, gate 100% giữ), `pnpm run build`, `pnpm run build-storybook`.
- **Reviewer**: `SEALED`, score 9, criticalCount 0, 2 finding (1 Medium — claim completeness ở mục 3 trên; 1 Low — `src/configs/` là layer mới chưa ghi vào doc kiến trúc). Evidence gate: `SEALED (hard)`.
- Evidence dir: `plans/reports/260911-0033-next-image-google-avatar-host/evidence/`.

---

## Bài học mang đi

**Config không có bề mặt test được thì không ai dựng gate cho nó — và lỗi sẽ về lại bằng cửa khác.** Ở đây "cửa khác" là một remote image origin thứ hai, cách lần đầu vài phase. Phần đắt nhất của bản fix không phải thêm một host, mà là dời list sang chỗ test bám được rồi khoá bằng gate coverage đang có.

Kèm theo: khi một phase quyết định né bug vì file không thuộc ownership của nó (hoàn toàn hợp lý), thứ còn thiếu là ghi nợ đó ra chỗ ai cũng thấy. Comment `eslint-disable` ngay tại chỗ né chỉ người mở đúng file đó mới đọc được.
