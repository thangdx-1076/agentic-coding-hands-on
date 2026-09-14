---
title: "Google login chết trên production vì env var để Type Secret — deploy vẫn xanh"
date: 2026-09-11
time: "18:23 → 18:45"
tags: [vercel, supabase, oauth, next16, cd, env-vars]
severity: high
---

# Bối cảnh

Login Google chạy tốt ở local nhưng production (`agentic-coding-hands-on-orpin.vercel.app`)
luôn hiện dòng đỏ "Đăng nhập không thành công. Vui lòng thử lại." ngay khi nhấn nút.
CD run 34593087518 xanh toàn bộ, smoke check 200.

---

## Root cause

`NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` trên Vercel
được tạo với Type **Secret** thay vì **Config**.

`cd.yml` build trong GitHub Actions rồi ship `--prebuilt`, nên nó phải `vercel pull`
giá trị thật xuống runner. Vercel không trả giá trị của biến Secret cho bất kỳ ai,
kể cả `vercel pull` — CLI ghi chuỗi `[SENSITIVE]` (hằng
`SENSITIVE_ENV_VALUE_PLACEHOLDER`) vào `.env.production.local`
(`pullAllEnvFiles`: `` `.env.${environment}.local` ``). Next inline mọi
`NEXT_PUBLIC_*` vào bundle client lúc build.

Bằng chứng, theo thứ tự tìm ra:

1. Log bước `vercel pull`: `! 11 Secret values cannot be pulled from the production Environment. Wrote "[SENSITIVE]" as placeholders`
2. Bundle production `/_next/static/chunks/3wl9lkuotmrtl.js` chứa
   `createBrowserClient(...)("[SENSITIVE]","[SENSITIVE]")`
3. Vercel CLI `dist/chunks/chunk-XZ2JXEXU.js`: `SENSITIVE_ENV_VALUE_PLACEHOLDER="[SENSITIVE]"`

---

## Vì sao pipeline không bắt được

Không bước nào có cơ sở để đỏ:

- `vercel pull` — dòng bắt đầu bằng `!` là cảnh báo, exit 0. CLI coi việc không lấy
  được Secret là hành vi đúng, và còn khuyên "replace them with local-only values"
  vì nó giả định người dùng đang pull về máy để dev.
- `vercel build` — `[SENSITIVE]` là string hợp lệ. `createBrowserClient` chỉ throw
  khi tham số **falsy** (`@supabase/ssr/dist/main/createBrowserClient.js`:
  `if (!supabaseUrl || !supabaseKey) throw`), chuỗi rác thì nhận.
  `resolveSupabasePattern` bắt `new URL()` throw rồi `return null` — đúng chủ ý
  "config load must never crash over a bad env var".
- Smoke check — `curl --fail` trên `/` được 200 vì trang render ở server, mà biến
  server đọc từ runtime env của Vercel nên vẫn là giá trị thật.

Lỗi chỉ sống trong bundle client và chỉ hiện ra khi có người **nhấn** nút. Không
bước nào trong pipeline nhấn nút — e2e `@auth` bị loại khỏi CI vì cần Supabase thật.

---

## Cách khoanh vùng (hữu ích cho lần sau)

Thứ chốt hạ vấn đề là **log GoTrue**, không phải đọc code:

```bash
docker logs supabase_auth_saa-app 2>&1 | grep '"path":"/authorize"'
```

Zero request `/authorize` ở thời điểm user thử → click chết ở client, chưa từng
đi tới Supabase. Cắt ngay được nửa cây giả thuyết (Google OAuth config, redirect
allow-list, PKCE verifier, `exchangeCodeForSession`).

Guard `src/api/auth.ts` nuốt lỗi thành `{ ok: false }` là cố ý (không render lỗi
thô của provider ra trang), nhưng nó cũng xoá luôn mọi manh mối. Console browser
không có gì, UI chỉ có một dòng chữ cố định.

---

## Hệ quả thứ hai, cùng nguyên nhân

`next.config.ts` gọi `resolveImagesRemoteConfig()` lúc build. Với
`NEXT_PUBLIC_SUPABASE_URL="[SENSITIVE]"` thì production **không có** remotePattern
nào cho Supabase Storage → ảnh kudo ném "hostname is not configured under images"
lúc render. Chưa ai gặp vì chưa có ai đăng nhập được để viết kudo.

---

## Bài học

- **Để `NEXT_PUBLIC_*` là Secret không giấu được gì.** Next inline chúng vào JS gửi
  xuống browser; ai xem source cũng đọc được. Đổi lại, nó phá đúng cái pipeline
  build-ngoài-Vercel. Type `Secret` chỉ dành cho biến server-only.
- **Guard "không được crash" đẻ ra lỗi im lặng.** Ba lớp guard độc lập
  (`try/catch` trong `resolveSupabasePattern`, `catch` trong `signInWithGoogle`,
  `?? false` cho cờ SSRF) mỗi cái đều hợp lý một mình, nhưng cộng lại thì một env
  var rác đi xuyên từ build tới browser mà không để lại dấu vết nào.
- **Smoke check trên `/` không chứng minh được gì về client.** SSR khỏe vì runtime
  env khác build-time env. Muốn gate thật thì grep bundle sau deploy, hoặc chạy
  e2e `@auth` trên chính deployment.
- Cảnh báo `!` của một CLI không làm job đỏ. Nếu nó quan trọng thì phải tự grep
  output rồi `exit 1`.

---

## Đã làm

- `docs/deployment.md` Bước 4.2: thêm cột **Type** vào bảng env var + khối cảnh báo
  giải thích cơ chế, cách sửa (xoá và Add lại, không convert được), và lệnh `curl`
  grep bundle để kiểm sau deploy.
- `docs/deployment.md` § "Những gì pipeline này không đảm bảo": thêm mục về ca này.
- `plans/action-items.md`: việc người phải làm trên dashboard Vercel + Supabase.

## Chưa làm

- Chưa thêm gate grep-bundle vào `cd.yml` — ngoài phạm vi lần sửa docs này.
- Chưa xác minh hệ quả ảnh kudo trên production (cần đăng nhập được trước).
