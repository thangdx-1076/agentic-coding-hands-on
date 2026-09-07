---
phase: 05
feature: F005
track: B
status: ✅ done
priority: P2
test_policy: e2e-red-first
effort: 0.75h
owner: implementer
file_ownership:
  [
    "src/app/(public)/standards/page.tsx",
    "src/app/(public)/standards/_components/standards-client.tsx",
    "src/app/(public)/standards/_shared/build-standards-copy.ts",
  ]
---

# Phase 05 — Lắp `page.tsx` + client boundary + `buildCopy`

## MoMorph refs

- Thể lệ UPDATE: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/b1Filzi9i6 (frame `3204:6051`)
- Clarifications: `plans/260907-0935-standards-rules-page/clarifications.md`
- testPolicy: `e2e-red-first`

## Context Links

- `spec/F005_StandardsRulesPage/technical-spec.md` § 3.1 (A1), § 5.3 (data flow)
- `src/app/(public)/awards/page.tsx` — khuôn Server Component + `buildCopy` tách hàm
- `src/app/(public)/awards/_components/awards-client.tsx` — khuôn client boundary
- Kết quả phase 02: khoá `standards.*` trong `messages/{vi,en}.json`
- Kết quả phase 03: `_hooks/use-standards-close.ts`
- Kết quả phase 04: `_components/standards-screen.tsx`, `_shared/standards-copy.ts` (type + `HERO_TIERS` + `SECRET_BOX_BADGES`)

## Overview

**Priority**: P2 · **Status**: pending · **Track B** (`implementer`)
**Goal (1 dòng)**: Nối 3 mảnh lại — Server Component đọc locale + dựng `copy` từ i18n, client boundary gắn `handleClose`, `StandardsScreen` render — để `/standards` thôi 404.

## Out of scope

- Không sửa component nào của phase 04, không sửa hook của phase 03, không sửa `messages/*.json`.
- Không đọc `getViewer()` / Supabase / DAL — trang không cá nhân hoá, không có chrome nào cần session (FR-002, BR-002).
- Không sửa file test.

## Key Insights

- **Ba tầng, ba lý do tồn tại.** `page.tsx` (Server Component: locale + i18n → `copy`) → `standards-client.tsx` (`"use client"`, lý do duy nhất: `useStandardsClose` cần `useRouter`) → `StandardsScreen` (thuần trình bày). Đúng khuôn `/awards`, đúng rule "server-first, `use client` ở leaf thấp nhất".
- **`buildCopy` ở file riêng, không nhét vào `standards-copy.ts`.** `standards-copy.ts` bị component (bundle client) import; nếu nhét `getTranslations` vào đó là kéo `next-intl/server` sang phía client. Đặt ở `_shared/build-standards-copy.ts`, chỉ `page.tsx` import. `_shared/` **không** nằm trong allowlist coverage (chỉ `_hooks|_utils|_actions`) → không cần test colocated; Playwright phủ nó ở phase 06.
- **`buildCopy` map qua bảng của phase 04, không gõ tay 10 leaf.** `HERO_TIERS.map(t => t.slug)` + `SECRET_BOX_BADGES.map(b => b.slug)` → đọc `t(\`heroSection.tiers.${key}.condition\`)`. Một chỗ đổi slug là cả hai phía đổi theo. Gõ tay 4 + 6 nhánh là chỗ lệch chính tả sinh ra.
- **Giữ `page.tsx` mỏng** — file limit 200 dòng; `/awards` đã phải tách `buildCopy` ra khỏi thân page vì đúng lý do này. Ở đây tách hẳn sang file riêng, `page.tsx` chỉ còn `metadata` + đọc locale + gọi `buildCopy` + render, ước tính < 60 dòng.
- **Destructure hook ngay tại call site**: `const { handleClose } = useStandardsClose();` — giữ nguyên object rồi đọc `x.handleClose` sẽ ăn lỗi `react-hooks/refs` (React Compiler). Đây là lỗi `pnpm lint` thật, không phải warning.
- **`metadata.title`** = "Thể lệ" (vi) — theo khuôn `/awards` (`metadata` tĩnh, không `generateMetadata` động; YAGNI, không TC nào assert title tab).
- **Không `notFound()`, không `redirect()`, không `try/catch`.** Không có I/O nào để hỏng: `getTranslations` đọc JSON bundle tại build. Trang này không có nhánh fail-open như `/awards` vì không có gì để fail.

## Requirements

- `src/app/(public)/standards/page.tsx`: `export const metadata`, `export default async function StandardsPage()`, đọc `getLocale()` + `normalizeLocale`, `getTranslations("standards")`, gọi `buildCopy`, render `<StandardsClient copy={copy} />`.
- `standards-client.tsx`: `"use client"`, `const { handleClose } = useStandardsClose();`, render `<StandardsScreen copy={copy} onClose={handleClose} />`. Không state riêng, không `useEffect`.
- `build-standards-copy.ts`: `buildStandardsCopy(t): StandardsCopy`, map qua `HERO_TIERS`/`SECRET_BOX_BADGES`, trả object khớp type của phase 04.
- Cả 3 file ≤ 200 dòng; `"use client"` chỉ ở `standards-client.tsx`.

## Architecture

```text
GET /standards
  page.tsx (Server Component)
    getLocale() → normalizeLocale → locale
    getTranslations("standards") → t
    buildStandardsCopy(t) ──uses──▶ HERO_TIERS / SECRET_BOX_BADGES (_shared/standards-copy.ts)
    └─▶ <StandardsClient copy={copy} />
          "use client"
          const { handleClose } = useStandardsClose()      (_hooks, phase 03)
          └─▶ <StandardsScreen copy={copy} onClose={handleClose} />   (phase 04)

click "Đóng"      → handleClose() → router.back() | router.push(ROUTES.HOME)
click "Viết KUDOS"→ <Link href="/kudos">          (điều hướng thuần, không JS)
```

## Related Code Files

**Create**: `src/app/(public)/standards/page.tsx`, `src/app/(public)/standards/_components/standards-client.tsx`, `src/app/(public)/standards/_shared/build-standards-copy.ts`
**Modify**: — · **Delete**: —
**Chỉ đọc**: `src/app/(public)/awards/page.tsx`, `src/lib/i18n/locale.ts`, `_shared/standards-copy.ts`, `_hooks/use-standards-close.ts`

## Implementation Steps

1. `build-standards-copy.ts`: nhận translator, map 2 bảng, trả `StandardsCopy`. Không import gì từ `_components/`.
2. `standards-client.tsx`: 15-25 dòng, destructure hook tại call site.
3. `page.tsx`: `metadata` + thân async ngắn; JSDoc nêu FR-001 (PUBLIC, không guard) và FR-002 (không Supabase) như `/awards/page.tsx` đang làm.
4. `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm build` → `pnpm typecheck` → `pnpm build-storybook`.
5. `lsof -ti:3000 | xargs -r kill -9`; `pnpm dev`; mở `/standards` xác nhận render đủ 3 section, cuộn được, 2 nút bấm được.
6. Chạy thử `pnpm test:e2e tests/e2e/standards.spec.ts` để biết còn bao nhiêu đỏ; **không sửa file test** — phần còn lại là việc của phase 06.

## Todo List

- [ ] `build-standards-copy.ts` map qua 2 bảng, không gõ tay leaf
- [ ] `standards-client.tsx` — destructure hook tại call site
- [ ] `page.tsx` — Server Component, `metadata`, ≤60 dòng
- [ ] `"use client"` chỉ xuất hiện đúng 1 lần trong segment
- [ ] Gate: lint · format · build · typecheck · storybook
- [ ] Xem tay `/standards` ở dev
- [ ] Chạy thử e2e, ghi số đỏ còn lại, không sửa test

## Success Criteria

- `/standards` trả 200 cho khách ẩn danh, render đủ h1 + 3 section + 2 nút; không redirect.
- `grep -rn "use client" "src/app/(public)/standards/"` ra **đúng 2** kết quả (`standards-client.tsx` và `_hooks/use-standards-close.ts`).
- `grep -rn "supabase\|@/dal\|getViewer" "src/app/(public)/standards/"` rỗng.
- `pnpm build` + `pnpm typecheck` xanh; cả 3 file ≤200 dòng; `page.tsx` ≤60 dòng.
- `pnpm test:e2e tests/e2e/standards.spec.ts` số test đỏ **giảm mạnh** so với bằng chứng RED phase 01 (xanh hoàn toàn là mục tiêu, nhưng phase 06 mới là nơi chốt).
- Không sửa file nào ngoài `file_ownership`.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Countermeasure |
|---|---|---|---|
| Nhét `getTranslations` vào `standards-copy.ts` → kéo `next-intl/server` sang client | Trung bình | Cao — build fail hoặc bundle phình | Tách hẳn `build-standards-copy.ts`; Success Criteria grep |
| Gõ tay 10 nhánh khoá i18n → sai 1 khoá, chuỗi hiện `standards.heroSection…` | **Cao** | Cao — e2e đỏ, nhìn thấy khoá thô trên UI | Map qua `HERO_TIERS`/`SECRET_BOX_BADGES`; xem tay ở bước 5 |
| Giữ object hook thay vì destructure → `react-hooks/refs` | Trung bình | Trung bình — `pnpm lint` đỏ | Ghi rõ ở Requirements + JSDoc hook (phase 03) |
| `"use client"` leo lên `page.tsx` | Thấp | Cao — Server Component vỡ, `metadata` mất tác dụng | Success Criteria đếm đúng 2 lần xuất hiện |
| Copy nguyên `getViewer()` từ `/awards/page.tsx` theo quán tính | Trung bình | Trung bình — gọi Supabase vô ích, SC-003 đỏ | Out of scope ghi đầu file; grep ở Success Criteria |
| Sửa test cho nhanh xanh ở bước 6 | Trung bình | Cao — phá test gate | `tests/**` không nằm trong `file_ownership`; cấm rõ |
| `page.tsx` phình > 200 dòng vì inline `buildCopy` | Thấp | Thấp | Đã tách file riêng từ đầu |

## Security Considerations

- Trang PUBLIC có chủ đích (FR-001/BR-001): **không** guard, **không** đọc session — cũng có nghĩa không có dữ liệu người dùng nào chảy qua trang này để rò rỉ.
- `proxy.ts` (phase 02) chỉ chuẩn hoá cookie locale cho path này, không thêm nhánh redirect nào.
- Không `dangerouslySetInnerHTML`, không nội dung động từ bên ngoài — mọi chuỗi đến từ JSON trong repo.
- `router.push` chỉ nhận `ROUTES.HOME` (hằng nội bộ) → không có open-redirect.

## Next Steps

Mở khoá phase 06 (`tester`: GREEN e2e + visual validation + regression). Sau khi xanh: `reviewer` đọc toàn bộ diff, rồi cân nhắc `doc-writer` cập nhật `docs/` nếu spec F005 được promote khỏi trạng thái draft.
