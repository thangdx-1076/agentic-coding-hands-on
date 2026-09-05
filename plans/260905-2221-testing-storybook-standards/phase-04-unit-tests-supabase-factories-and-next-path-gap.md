# Phase 04 — Test 3 factory Supabase + vá `next-path`

## Context Links

- [`plan.md`](./plan.md) · [`vitest-hooks-coverage`](../reports/researcher-260905-2221-vitest-hooks-coverage.md) § Q5(a), § Q5(b)
- Style tham chiếu (bắt buộc theo): `lib/auth/sign-in-with-google.test.ts`

## Overview

**Priority**: P1 · **Status**: completed · **Effort**: 1.5h · **Depends on**: 03

Kéo `lib/**` từ 64.1% lên 100%. Chạy song song được với phase 05 và 06.

## Key Insights

- Ba factory Supabase đang **0% coverage** — chúng mỏng, nhưng phần đáng test không phải
  "gọi được hàm" mà là **cookie adapter được nối đúng**: `getAll` uỷ thác đi đâu, `setAll`
  ghi lên đâu, và `setAll` của `server.ts` có thật sự nuốt exception không.
- `next-path.ts` ở 96.42%, thiếu đúng dòng 79-80 = `catch` trong `hasEncodedForbiddenChar`.
  Chìa khoá: cần một byte percent-encoded **không phải** ký tự control (nếu không vòng quét
  ASCII-control đã chặn trước). `decodeURIComponent("%80")` ném `URIError` — verify bằng Node
  thật, không suy đoán.
- Kết quả của `safeNextPath("/todo%80")` là **ACCEPT** (`"/todo%80"`), không phải reject.
  Một byte không decode được mà không phải control char thì chưa chứng minh được là tấn công.
  Đây là hành vi đúng — test phải khẳng định nó, không được "sửa" nó.
- Cả 3 factory đều mock `@supabase/ssr` → **không có request mạng nào**, MSW không tham gia
  phase này. Đó là chủ ý: file này test *dây nối*, phase 06 test *đường mạng*.

## Requirements

- FR-001: mỗi file logic có test co-located.
- FR-002: `lib/**/*.ts` đạt 100% statements/branches/functions/lines.
- Non-functional: giữ nguyên giọng test của repo — doc comment tiếng Việt giải thích *vì sao*
  mock như vậy, `as unknown as` thay vì `as any`.

## Architecture

| File test | Mock ở ranh giới nào | Khẳng định gì |
|---|---|---|
| `client.test.ts` | `@supabase/ssr` → `createBrowserClient` | Gọi đúng 2 tham số, đúng thứ tự (url, publishableKey) |
| `server.test.ts` | `@supabase/ssr` + `next/headers` | `getAll` uỷ thác về cookieStore; `setAll` ném → **không** rò exception ra ngoài |
| `proxy-client.test.ts` | `@supabase/ssr` | `setAll` ghi lên **CẢ** `request.cookies` **lẫn** `response.cookies` — bỏ nửa nào cũng mất session refresh |
| `next-path.test.ts` (sửa) | không mock gì | `safeNextPath("/todo%80")` → `"/todo%80"` |

Cách lấy cookie adapter ra để test: nó là tham số thứ 3 của `createServerClient`, nên
`vi.mocked(createServerClient).mock.calls[0][2].cookies` cho truy cập trực tiếp — không cần
dựng client thật.

## Related Code Files

**Tạo**
- `lib/supabase/client.test.ts`
- `lib/supabase/server.test.ts`
- `lib/supabase/proxy-client.test.ts`

**Sửa**
- `lib/supabase/next-path.test.ts` — thêm 1 case cho nhánh `catch`

**Xoá**: không có. **KHÔNG được sửa** bất kỳ file `.ts` non-test nào trong `lib/`.

## Implementation Steps

1. Trước khi viết: `node -e 'try{decodeURIComponent("%80")}catch(e){console.log(e.name)}'` →
   phải in `URIError`. Nếu không, tìm byte khác thoả 2 điều kiện ở § Key Insights.
2. `next-path.test.ts` — thêm case, đặt trong `describe` sẵn có, doc comment nói rõ vì sao
   ACCEPT là đúng.
3. `client.test.ts` — `vi.mock("@supabase/ssr", () => ({ createBrowserClient: vi.fn() }))`,
   khẳng định `expect(createBrowserClient).toHaveBeenCalledExactlyOnceWith(url, key)`.
   Env lấy từ `test.env` của phase 03, không set lại trong file.
4. `server.test.ts` — mock thêm `next/headers`. Hai case:
   - `getAll()` trả đúng list từ cookieStore;
   - `cookieStore.set` ném → `expect(() => cookieConfig.setAll([...])).not.toThrow()`.
     Đây là nhánh `catch{}` rỗng — không test thì mãi không đạt 100% branch.
5. `proxy-client.test.ts` — request/response giả có `.cookies.getAll/.set`. Khẳng định
   `request.cookies.set(name, value)` (2 tham số, không options) và
   `response.cookies.set(name, value, options)` (3 tham số). Sự bất đối xứng này chính là
   nội dung cần khoá lại.
6. `pnpm test:unit:coverage` — bảng `lib/**` phải 100% cả 4 cột. `hooks/**` và `app/**` vẫn
   0% ở phase này, đúng dự kiến.
7. Cửa xanh.

## Todo List

- [x] Xác minh `decodeURIComponent("%80")` ném `URIError`
- [x] `next-path.test.ts` +1 case nhánh `catch`
- [x] `client.test.ts`
- [x] `server.test.ts` (2 case, gồm nhánh `setAll` nuốt lỗi)
- [x] `proxy-client.test.ts` (khẳng định ghi CẢ 2 nơi)
- [x] `lib/**` = 100% trong bảng coverage
- [x] Cửa xanh 5 lệnh

## Success Criteria

```bash
pnpm test:unit                                    # exit 0
pnpm test:unit:coverage 2>&1 | grep -E "^ (client|server|proxy-client|next-path)\.ts" 
# cả 4 dòng phải là 100 | 100 | 100 | 100
pnpm lint --max-warnings 0 && pnpm format:check && pnpm build && pnpm typecheck   # exit 0
git diff --name-only | grep -v "\.test\.ts$"      # KHÔNG có file nào ngoài test
```

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Đối sách |
|---|---|---|---|
| Test khoá chặt implementation, sửa factory là đỏ oan | Trung bình | Trung bình | Chỉ khẳng định **hợp đồng quan sát được** (tham số truyền cho SDK, cookie ghi vào đâu), không khẳng định thứ tự dòng lệnh bên trong |
| `%80` không ném ở Node phiên bản khác | Thấp | Trung bình | Bước 1 xác minh trên chính máy chạy; nếu đổi, ghi lại byte đã dùng vào comment của test |
| `mock.calls[0][2]` gãy nếu `@supabase/ssr` đổi chữ ký | Thấp | Thấp | Version đã pin (0.12.5); nếu gãy là dấu hiệu breaking change thật, đáng để đỏ |
| Viết test cho `next-path` mà vô tình sửa `next-path.ts` | Thấp | Cao (đổi hành vi bảo mật) | `git diff --name-only` là success criteria — không file non-test nào được đổi |

## Security Considerations

- `next-path.ts` là chốt chặn open-redirect. Test phải **khoá hành vi hiện tại**, tuyệt đối
  không nới lỏng để "cho dễ pass".
- `server.ts` nuốt exception ở `setAll` là **đúng** (Server Component context read-only) —
  test khẳng định điều đó, không được biến thành "log rồi ném tiếp".
- Không hardcode key thật vào test; `test.env` của phase 03 là nguồn duy nhất.

## Next Steps

Phase 10 sẽ bật ngưỡng. Nếu phase này để `lib/**` dưới 100%, phase 10 sẽ đỏ — không có
đường vòng nào khác.
