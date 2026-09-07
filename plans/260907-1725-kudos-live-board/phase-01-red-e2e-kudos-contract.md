---
phase: 01
feature: F007, F008
track: test gate
status: pending
priority: P0
test_policy: e2e-red-first
effort: 1.5h
owner: tester
file_ownership: ["tests/e2e/kudos.spec.ts"]
---

# Phase 01 — RED: `tests/e2e/kudos.spec.ts` là hợp đồng DOM

## MoMorph refs

- Sun* Kudos - Live board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ (frame `2940:13431`)
- Clarifications: `plans/260907-1725-kudos-live-board/clarifications.md`
- testPolicy: `e2e-red-first`

## Context Links

- `momorph/test-cases-MaZUn5xHXZ.csv` — 41 TC. Parse bằng python `csv`, **không** `cut`/`awk` (ô có xuống dòng).
- `spec/kudosliveboard/functional-spec.md` § 4 (FR), § 5 (BR), § 9 (edge case) · `spec/kudosheartreaction/functional-spec.md` § 5
- `tests/e2e/awards.spec.ts` — khuôn gần nhất cho trang public (`test.use({ storageState: { cookies: [], origins: [] } })`)
- `tests/e2e/profile.spec.ts` + `tests/e2e/helpers/sign-in.ts` — khuôn cho nhánh `@auth`
- `.github/workflows/ci.yml:205,212` — `--grep-invert "@auth|@local-db"` ở **2 chỗ**, đã đúng sẵn

## Overview

**Priority**: P0 · **Status**: pending · **Test gate** (`tester`)
**Goal (1 dòng)**: Viết trọn hợp đồng DOM của `/kudos` thành một spec Playwright chạy **đỏ thật** vì `/kudos` còn 404, trước khi bất kỳ dòng code UI nào tồn tại.

## Key Insights

- **Ba tầng tag, không phải hai** (AD-7). DAL fail-open trả `[]` khi Supabase không với tới được — đúng cách `/awards` vẫn xanh trong CI. Nhờ đó nhánh CI-safe kiểm được **cả hai chuỗi empty state**, thứ mà `/profile` không làm được. Ai gộp hết vào `@auth` là vứt đi phần lớn giá trị CI của màn này.
- **RED hợp lệ = assertion thất bại thật.** `/kudos` 404 → `page.goto("/kudos")` vẫn resolve (Next trả 404 page, không throw), nên phải để `expect(locator).toBeVisible()` là thứ đỏ. Exit code khác 0 vì lỗi cài đặt browser, dev-server chết hay Supabase down **không tính là RED**.
- **Ô nhập A.1 và nút "Xem chi tiết" là bẫy.** Cả hai render nhưng KHÔNG mở gì (frame đích chưa build). Assert đúng "có mặt và không điều hướng", đừng assert một dialog sẽ không bao giờ mở.
- **Chuỗi phải chép từng ký tự.** `Hiện tại chưa có Kudos nào.` (có dấu chấm), `Chưa có dữ liệu` (không dấu chấm), `Hôm nay, bạn muốn gửi lời cảm ơn và ghi nhận đến ai?`, `Tìm kiếm`, và toast tiếng Anh `Link copied — ready to share!` (em dash `—`, không phải hyphen).

## Requirements — bảng hợp đồng

Mỗi dòng là một `test()`. Cột Tag quyết định test chạy ở đâu.

| # | Tag | Assertion | TC | FR/BR |
|---|-----|-----------|----|----|
| C01 | *(CI-safe)* | `GET /kudos` → 200, URL vẫn là `/kudos`, **không** redirect `/login` | TC[02] | FR-101, FR-102, BR-015 |
| C02 | *(CI-safe)* | `[data-testid=kudos-banner]` chứa `Hệ thống ghi nhận lời cảm ơn`; logo SAA 2025 KUDOS có `alt` | TC[03] | FR-201 |
| C03 | *(CI-safe)* | `[data-testid=kudos-compose-pill]` là `input`, `placeholder` khớp nguyên văn, `readonly`, có icon bút bên trái | TC[04], TC[16] | FR-202 |
| C04 | *(CI-safe)* | `[data-testid=kudos-filter-hashtag]` và `[data-testid=kudos-filter-department]` visible, không `disabled` | TC[07], TC[08] | FR-206 |
| C05 | *(CI-safe)* | `[data-testid=kudos-sunner-search]` có `placeholder="Tìm kiếm"`, `maxlength="100"`; nút submit `disabled` khi ô rỗng | TC[11], TC[17], TC[19] | FR-209, BR-010 |
| C06 | *(CI-safe)* | Gõ 101 ký tự → `inputValue()` dài đúng 100 | TC[19] | BR-010 |
| C07 | *(CI-safe)* | Không có kudo nào → `[data-testid=kudos-empty]` xuất hiện **2 lần** (carousel + feed), text `Hiện tại chưa có Kudos nào.` | TC[21] | FR-212, BR-011 |
| C08 | *(CI-safe)* | Cả 2 `[data-testid=kudos-leaderboard]` hiện `Chưa có dữ liệu` | TC[22] | FR-213, BR-012 |
| C09 | *(CI-safe)* | `[data-testid=kudos-sidebar]` visible; ẩn danh → `[data-testid=kudos-stat-row]` đúng **0** phần tử và không có `[data-testid=kudos-open-gift]` | TC[15] | D001 |
| C10 | *(CI-safe)* | Thứ tự tài liệu: header → banner → pill → highlight → spotlight → feed+sidebar → footer | TC[13] | FR-201…FR-211 |
| C11 | `@local-db` | Carousel hiện đúng 5 `[data-testid=kudos-card][data-variant=highlight]`; `[data-testid=kudos-slide-counter]` đọc `1/5` | TC[09] | FR-203, BR-001 |
| C12 | `@local-db` | Slide 1: nút prev `disabled`. Bấm next 4 lần → counter `5/5`, next `disabled`, prev bật lại | TC[31] | FR-204, BR-002, SM-001 |
| C13 | `@local-db` | Thẻ Kudos có đủ: tên+phòng ban người gửi, mũi tên, tên+phòng ban người nhận, thời gian khớp `/^\d{2}:\d{2} - \d{2}\/\d{2}\/\d{4}$/`, nội dung, hashtag, nút tim, nút Copy Link | TC[10], TC[14] | FR-205 |
| C14 | `@local-db` | Chọn 1 hashtag từ dropdown → URL có `?hashtag=`, **cả** carousel **và** feed chỉ còn thẻ mang tag đó, counter về `1/5` hoặc `1/N` | TC[28], TC[30] | FR-206, BR-003 |
| C15 | `@local-db` | Chọn 1 phòng ban → URL có `?department=`, cả hai khu vực lọc theo | TC[29] | FR-206, BR-003 |
| C16 | `@local-db` | Bấm 1 `[data-testid=kudos-hashtag]` ngay trên thẻ → cùng kết quả C14 | TC[30] | FR-207, BR-004 |
| C17 | `@local-db` | Lọc bằng hashtag không khớp kudo nào → 2 empty state, **không** lỗi | TC[21] | BR-011 |
| C18 | `@local-db` | Đếm thẻ feed, cuộn tới `[data-testid=kudos-feed-sentinel]` → số thẻ tăng, URL **không đổi** | TC[13] | FR-210 |
| C19 | `@local-db` | Cuộn tới cuối dữ liệu → sentinel biến mất, không request thêm, **không** empty state | — | A2 edge |
| C20 | `@local-db` | `[data-testid=kudos-spotlight-total]` khớp `/^\d+ KUDOS$/` và số đó **bằng** số hàng `kudos` đã seed | TC[12] | FR-208, BR-009 |
| C21 | `@local-db` | Gõ tên một Sunner có trong scatter + Enter → đúng node đó có `data-matched="true"`, URL không đổi | TC[27] | FR-209, D002 |
| C22 | `@local-db` | Ẩn danh: `[data-testid=kudos-card-heart]` **visible** và `disabled`, có `title` mời đăng nhập | TC[32] | FR-602, BR-014, F008 FR-203 |
| C23 | `@local-db` | Copy Link → clipboard chứa URL kudo, `[data-testid=kudos-toast]` hiện `Link copied — ready to share!` (cấp quyền `clipboard-read`/`clipboard-write` qua `context.grantPermissions`) | TC[33] | FR-401 |
| C24 | `@local-db` | `[data-testid=kudos-card-detail]` render nhưng **không** phải `<a href>` và click không đổi URL *(đích hoãn)* | TC[34] | § Out of scope |
| C25 | `@auth` | Đã đăng nhập: bấm tim trên kudo người khác → icon đổi sang trạng thái `data-hearted="true"`, số tim +1; bấm lại → về `false`, -1 | TC[32], TC[24] | F008 FR-401, BR-001 |
| C26 | `@auth` | Kudo do chính mình gửi → nút tim `disabled` | TC[23] | F008 FR-202, BR-002 |
| C27 | `@auth` | Sidebar hiện đúng 5 `[data-testid=kudos-stat-row]` + nút `Mở quà` (disabled) | TC[15] | FR-211 |
| C28 | `@auth` | Bấm tên/avatar trên thẻ → URL tới `/profile?id=<uuid>` | TC[00], TC[35], TC[36] | FR-402, US008 |
| C29 | `@auth` | Ẩn danh bấm tên/avatar → URL về `/login` *(gate `(protected)/layout.tsx` có sẵn, không code mới)* | TC[02] | FR-601, BR-013 |

## Implementation Steps

1. Preflight: `lsof -ti:3000 | xargs -r kill -9` (dev server cũ phục vụ sai dữ liệu), rồi xác nhận Supabase còn sống: `curl -s http://127.0.0.1:54321/auth/v1/health`.
2. Tạo `tests/e2e/kudos.spec.ts` với 3 `test.describe` tương ứng 3 tầng tag. Tag đặt trong **tiêu đề test**, đúng cách `profile.spec.ts` đang làm, để `--grep-invert` bắt được.
3. Khối CI-safe mở đầu bằng `test.use({ storageState: { cookies: [], origins: [] } })`.
4. Khối `@auth` dùng `createTestSession` + `injectSupabaseSession` từ `tests/e2e/helpers/sign-in.ts`; email phải là email **chưa từng tồn tại** và truyền `full_name` qua metadata (trigger `0002` dùng `ON CONFLICT DO NOTHING` — lần signup thứ hai không sửa được `full_name` đã NULL).
5. C23 gọi `context.grantPermissions(["clipboard-read", "clipboard-write"])` trước khi `goto`.
6. Viết header comment dạng bảng C01–C29 y như `standards.spec.ts` để phase 07–13 đọc thẳng.
7. Chạy `pnpm test:e2e` → ghi lại `redCommand`, `redExitCode`, và **assertion thật sự đỏ** (không phải lỗi hạ tầng) vào `plans/260907-1725-kudos-live-board/evidence/red-evidence.md`.

## Todo List

- [ ] Preflight: kill port 3000, xác nhận Supabase health 200
- [ ] Parse 41 TC bằng python `csv`, đối chiếu đủ 29 dòng hợp đồng
- [ ] Viết 3 describe block + header comment bảng C01–C29
- [ ] Chạy `pnpm test:e2e`, xác nhận đỏ vì assertion chứ không vì hạ tầng
- [ ] Chạy `pnpm exec playwright test --grep-invert "@auth|@local-db" --list` → xác nhận đúng 10 test CI-safe
- [ ] Ghi `evidence/red-evidence.md`: `redTestFiles`, `redCommand`, `redExitCode`, `redFailure`
- [ ] `pnpm lint --max-warnings 0` + `pnpm format:check`

## Success Criteria

- `pnpm test:e2e` thoát **khác 0**, và log chỉ ra ít nhất 1 assertion `toBeVisible`/`toContainText` thất bại trên `/kudos`.
- `--grep-invert "@auth|@local-db" --list` liệt kê đúng **10** test (C01–C10) — không nhiều hơn, không ít hơn.
- 5 e2e spec cũ (`home`, `login`, `awards`, `standards`, `profile`) vẫn xanh nguyên: `/kudos` chưa tồn tại nên không thể đã phá gì.
- `evidence/red-evidence.md` tồn tại và ghi đúng exit code quan sát được.

## Risk Assessment

| Rủi ro | Khả năng | Ảnh hưởng | Countermeasure |
|---|---|---|---|
| RED giả vì Supabase down chứ không vì màn hình | Trung bình | Cao — cả 6 phase UI xây trên hợp đồng rỗng | Bước 1 bắt buộc `curl` health trước; nếu 000 thì `supabase start` từ repo root, **không** `db reset` |
| Tag đặt sai chỗ → `@local-db` lọt vào job CI | Trung bình | Cao — CI đỏ trường kỳ, không ai sửa được | Bước "đếm đúng 10 test" ở Success Criteria là cửa cứng |
| Chép sai một ký tự chuỗi tiếng Việt (dấu chấm cuối, `—` vs `-`) | Cao | Trung bình — GREEN không bao giờ tới | Copy/paste từ CSV qua python, không gõ tay |
| C18/C19 flaky vì `IntersectionObserver` chưa gắn | Trung bình | Trung bình | `expect.poll` trên số thẻ thay vì `waitForTimeout` |

## Security Considerations

Spec này là file test — không chạm dữ liệu thật. Nhánh `@auth` tạo `auth.users` row mới qua helper; dùng email domain riêng để phase 05 và bước rollback phân biệt được với 8 Sunner demo.

## Next Steps

Mở khoá **toàn bộ** phase còn lại. Phase 07–12 nhận file này ở dạng read-only và không được sửa nó — chỉ phase 14 (cùng owner `tester`) mới nhận lại quyền ghi.
