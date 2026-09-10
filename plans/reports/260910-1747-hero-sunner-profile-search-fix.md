# Fix report — "Tìm kiếm profile Sunner" trên /kudos

- Date: 2026-09-10
- Skill: `/tkm:fix-bug` (autonomous)
- Branch: `main` (uncommitted khi viết report)
- Diagnosis: `plans/reports/260910-1728-hero-sunner-profile-search/diagnosis.md`
- Evidence: `plans/reports/260910-1728-hero-sunner-profile-search/evidence/`

## Root cause

`src/app/(public)/kudos/_components/kudos-hero-search-pill.tsx:48-54` (bản trước fix) —
ô input duy nhất mang nhãn "Tìm kiếm profile Sunner" render `readOnly`, không
`value`/`onChange`, không dropdown, không điều hướng. Gõ vào mất chữ; không có
đường nào mở profile Sunner khác từ ô đó.

Không phải regression: readOnly từ commit dựng UI `76987f1`. Docblock cùng file
ghi lý do lúc đó (design chưa có frame cho danh sách kết quả), nhưng cái ship ra
là một ô search im lặng ăn hết keystroke.

## Pre-fix evidence (RED)

Chạy contract mới trên code HEAD (chỉ revert 2 file source, giữ test):

```
[C30] ✘ Error: expect(locator).not.toHaveAttribute(expected) failed
      14 × locator resolved to <input readonly type="text"
           aria-label="Tìm kiếm profile Sunner" .../>
[C31] ✘ Test timeout: dropdown [data-testid=kudos-hero-search-options] không tồn tại
```

## Fix

Nối pill vào hạ tầng search đã có sẵn, không dựng lớp mới:

| File | Thay đổi |
|---|---|
| `_hooks/use-hero-profile-search.ts` | **mới** — query cap 128 (bằng cap của Server Action), bọc `useSunnerSuggest` (chỉ khi đã đăng nhập), open/dismiss dropdown dạng derived, `openProfile()` push `/profile?id=<encoded>`, Enter mở kết quả đầu |
| `_hooks/use-hero-profile-search.test.ts` | **mới** — 10 test, giữ gate coverage 100% |
| `_components/kudos-hero-profile-search.tsx` | **mới** — client wrapper giữ state, cùng khuôn `kudos-compose-launcher.tsx`; map `SunnerSuggestion` → `KudosSunnerOption` |
| `_components/kudos-hero-search-pill.tsx` | bỏ `readOnly`, thành combobox controlled, render `KudosSunnerOptions` dùng chung |
| `_components/kudos-keyvisual-band.tsx` | render wrapper, truyền `isSignedIn` |
| `_shared/build-kudos-copy.ts` | thêm type `KudosHeroSearchCopy` + 3 key copy |
| `messages/{vi,en}.json` | `kudos.heroSearch.loading` / `.empty` / `.signInHint` |
| `_components/kudos-hero-search-pill.stories.tsx` | 4 story (default / có kết quả / loading / chưa đăng nhập) |
| `tests/e2e/kudos.spec.ts` | contract C30, C31, C32 |

Data source không đổi: Server Action `searchSunners` → `src/dal/sunner-search.ts` →
view `public.profile_cards` (`GRANT SELECT TO authenticated`, migration 0005).
Cùng nguồn combobox người nhận đang dùng — không thêm surface query thứ hai.

## Prevention

| Lớp | Cách chặn |
|---|---|
| Regression test | C30/C31/C32, đã chứng minh RED trước fix / GREEN sau fix |
| Type safety (chặn cả họ lỗi) | Props của pill giờ **bắt buộc** `query`/`onQueryChange`/`options`/`isOpen`/`onSelect`/`onDismiss`/`onSubmit` — TypeScript không cho render lại nó thành ô chết |
| Entry-point validation | Cap 128 ký tự ở cả client (`maxLength` + hook) và Server Action |
| Silent failure | Khách chưa đăng nhập thấy "Đăng nhập để tìm profile Sunner" thay vì "không tìm thấy" — `/kudos` public nhưng `profile_cards` chỉ cấp cho `authenticated`, nói "không tìm thấy" là nói sai về dữ liệu |

## Verification (7/7 exit 0)

| Command | Exit |
|---|---|
| `pnpm run typecheck` | 0 |
| `pnpm lint --max-warnings 0` | 0 |
| `npx prettier --check .` | 0 |
| `pnpm run test:unit:coverage` | 0 (83 file, 808 test, coverage 100%) |
| `pnpm run test:e2e tests/e2e/kudos.spec.ts` | 0 (31 pass, 1 skip có sẵn) |
| `pnpm run build` | 0 |
| `pnpm run build-storybook` | 0 |

Visual: chụp `/kudos` với dropdown mở — panel không bị cắt bởi overflow của banner,
chữ đọc được trên artwork tối, input hiện đúng chữ đã gõ.

Review: `reviewer` chạy lại unit + e2e độc lập, verdict `SEALED`, score 9,
0 critical, `contractStatus: OK`, không finding nào.

## Câu hỏi còn mở

- Design không có frame riêng cho dropdown của hero pill (giống dropdown người
  nhận đã ship) → đang mượn nguyên shape `KudosSunnerOptions` màu kem. Nếu sau
  này MoMorph ra frame thật thì chỉnh lại màu/độ rộng theo frame đó.
- `messages/en.json` vẫn để placeholder tiếng Việt "Tìm kiếm profile Sunner"
  (có sẵn từ trước, không sửa trong PR này).
