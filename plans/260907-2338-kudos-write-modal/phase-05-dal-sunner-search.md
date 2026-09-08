---
phase: 05
feature: F009
track: B
status: completed
priority: P1
test_policy: e2e-red-first
effort: 0.75h
owner: implementer
file_ownership:
  [
    "src/dal/sunner-search.ts",
    "src/dal/sunner-search.test.ts",
    "src/dal/sunner-search-client.ts",
    "src/dal/sunner-search-client.test.ts",
    "src/app/(public)/kudos/_actions/search-sunners.ts",
    "src/app/(public)/kudos/_actions/search-sunners.test.ts",
  ]
---

# Phase 05 — DAL `sunner-search` + Server Action tìm người nhận

## Context Links

- `src/dal/profile-cards.ts:74` (`getProfileCard`, đọc-1-id) — khuôn gần nhất; **KHÔNG sửa file này** (địa phận F006)
- `src/dal/kudos-client.ts:57` (`toKudosClient`) — khuôn adapter thu hẹp kiểu builder, tránh TS2589
- `supabase/migrations/0005_profile_cards_view.sql:70` — `GRANT SELECT` chỉ `authenticated`; doc-comment cấm nới SELECT list (SEC_004)
- `supabase/migrations/0001_users_table.sql:55-59` — `public.users` FORCE RLS own-row ⇒ không query trực tiếp được
- `src/app/(public)/kudos/_actions/load-more-kudos.ts` — khuôn Server Action **chỉ đọc**, không `revalidatePath`
- `research/researcher-data-layer-report.md` § 2, § 5 · `spec/system/architecture.md` § "DAL đọc mới"

## Overview

**Priority**: P1 · **Track B** (`implementer`) · **Goal**: một hàm đọc-nhiều mới trên view `profile_cards` (A2), cộng Server Action mỏng để client component gọi được — fail-open trả mảng rỗng, không bao giờ throw.

## Requirements

FR-202, FR-402(một phần) · US001 · spec item B, B.2 · TC ID-25, ID-26, ID-50 · A2 trong technical-spec § 3.1 · SEC_004.

## Architecture notes

```text
kudos-recipient-field (client) → searchSunners action ("use server")
    → toSunnerSearchClient(await createClient()) → searchSunners(client, query, limit)
    → profile_cards: select("id,full_name,avatar_url").ilike("full_name", `%${q}%`).limit(8)
```

- `src/dal/sunner-search.ts`: `import "server-only"`, client **injected** (không tự tạo — pattern `getKudosBoard`/`getProfileCard`), trả `SunnerSuggestion[] = { id, fullName, avatarUrl }[]`. Lỗi Supabase / `data === null` / exception → `[]` (fail-open, đúng triết lý `getAwards`/`getProfileCard`; ô chọn người nhận hiện "không có kết quả" chứ không chặn dialog).
- `src/dal/sunner-search-client.ts`: `toSunnerSearchClient(supabase: ServerSupabaseClient): SunnerSearchClient` — literal-type cho column list như `AwardColumns`.
- `_actions/search-sunners.ts`: `"use server"`, `query` phải là string `.trim().length >= 1`, chặn độ dài trên (128 ký tự) trước khi xuống DAL; escape ký tự pattern của `ilike` (`%`, `_`, `\`) để `%` người dùng gõ không thành wildcard. Đây là action **chỉ đọc** → **không** `revalidatePath` (đúng lý do `load-more-kudos.ts:20-26` ghi).
- 3 cột, không hơn: **không** nới SELECT list của view (SEC_004), **không** trả `department`/`email`.

## Implementation Steps

1. Test trước: `sunner-search.test.ts` dựng stub builder tay theo `stubSupabase()` của `toggle-kudo-heart.test.ts:36-90` — chuỗi gọi phải khớp đúng `.select().ilike().limit()`.
2. `sunner-search.ts`: `searchSunners(client, query, limit = 8)`. `query.trim() === ""` → `[]` **không gọi Supabase**. Map `full_name → fullName`, `avatar_url → avatarUrl`, giữ `null` như view trả.
3. `sunner-search-client.ts` + test: adapter + literal column type.
4. `_actions/search-sunners.ts` + test: validate `query`, escape ký tự `ilike`, gọi `createClient()` → adapter → DAL. Trả thẳng `SunnerSuggestion[]` (mảng rỗng khi không hợp lệ), không dùng discriminated union — đây là read, không phải write.
5. `pnpm exec vitest run src/dal/sunner-search.test.ts src/dal/sunner-search-client.test.ts "src/app/(public)/kudos/_actions/search-sunners.test.ts"` rồi `pnpm test:unit:coverage`.
6. Kiểm tay bằng `psql`: `SELECT id, full_name FROM public.profile_cards WHERE full_name ILIKE '%ng%' LIMIT 8;` — xác nhận có Sunner thật để C21 dựa vào (lưu ý ~196 hàng `users` là rác e2e với `full_name` NULL; `ilike` tự loại chúng).

## Todo List

- [ ] `import "server-only"` + client injected, không tự tạo client trong DAL
- [ ] `query` rỗng → `[]`, không đi Supabase
- [ ] Escape `%`/`_`/`\` trước khi đưa vào `ilike`
- [ ] Fail-open `[]` cho mọi lỗi, không throw
- [ ] Action **không** `revalidatePath`
- [ ] Đúng 3 cột `id, full_name, avatar_url`
- [ ] `pnpm test:unit:coverage` 100% trên 3 file mới · lint · format

## Success Criteria

- 3 file mới đạt 100% coverage; `pnpm test:unit:coverage` xanh.
- `grep -n "profile_cards" src/dal/sunner-search.ts` chỉ ra đúng một `select("id,full_name,avatar_url")` — không `SELECT *`, không cột thứ tư.
- `src/dal/profile-cards.ts` **không đổi một dòng**: `git diff --stat src/dal/profile-cards.ts` rỗng.
- Với Supabase bị tắt, `searchSunners` trả `[]` chứ không throw (test giả lập lỗi chứng minh).
- Mỗi file ≤200 dòng.

## Risk Assessment

| Rủi ro | KN | AH | Countermeasure |
|---|---|---|---|
| Query thẳng `public.users` cho tiện | TB | Cao — FORCE RLS own-row, trả về rỗng và debug rất lâu | § Architecture ghi rõ đi qua `profile_cards`; test dựng trên bảng view |
| Nới SELECT list view để lấy thêm `department` | TB | Cao — vi phạm SEC_004, rò dữ liệu | Success Criteria có grep; doc-comment view tự cấm |
| Sửa `src/dal/profile-cards.ts` vì "cùng đọc một view" | TB | TB — vỡ ranh giới sở hữu với F006 | `git diff --stat` là cửa cứng |
| `%` người dùng gõ thành wildcard → quét cả bảng | TB | TB | Bước 4 escape + `limit(8)` |
| TS2589 khi truyền `ServerSupabaseClient` qua nhiều tầng | TB | TB — build đỏ khó hiểu | Adapter `to*Client` đúng pattern repo |

## Security Considerations

Đường **đọc**, nên fail-open là đúng (khác đường ghi ở phase 06, fail-closed tuyệt đối). Hai giới hạn: view chỉ cho `authenticated` nên khách chưa đăng nhập gọi action này sẽ nhận `[]` — không rò danh sách nhân sự cho người ngoài, và đó là hành vi mong muốn chứ không phải lỗi. Và đúng 3 cột: `email`/`role`/`locale` không bao giờ được đi qua đường này.

## Next Steps

Mở khoá phase 07 (hook `use-sunner-suggest` gọi action này) và phase 13 (truyền action xuống form).
