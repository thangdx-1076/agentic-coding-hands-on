---
title: "Hook extraction, React Compiler freeze, feature specs gate first run, verification layer asymmetry"
date: 2026-09-05
time: "21:47 → 22:03"
tags: [refactor, hook-extraction, react-compiler, feature-specs, verification-layers, lint-staleness]
severity: medium
---

# Tóm tắt

Refactor tách logic bàn phím từ `LanguageSelector` vào `useMenuKeyboardNav` hook và login action vào `lib/auth`. React Compiler ngăn chặn việc giữ object trả từ hook rồi truy cập thuộc tính trong render — **10 lỗi `react-hooks/refs`**. Cách duy nhất qua gate: destructure tại call site hoặc trả callback chứ không RefObject. Feature specs khỉu khiếu lệ chưa chạy lần nào (`last_feature_spec_run_sha` rỗng) — khi chạy lần đầu, nó thay thế 49 marker `*(planned)*` và `TBD (draft)`. Bài học từ verification layer: validator sơ suất được reviewer bắt, reviewer bị reviewer khác phủ nhận, re-reviewer lại tìm bug ở chỗ cũ — mỗi lớp mù khác nhau. Lỗi riêng của tôi: chạy lint trước khi tester viết test file, nên báo cáo "lint clean" dựa trên tree lỏng lẻo.

---

## React Compiler từ chối giữ object trả từ hook

### Vấn đề

First attempt tách logic: component gọi hook và lưu kết quả:

```typescript
const menu = useMenuKeyboardNav({ itemCount: OPTIONS.length });
// Rồi trong JSX:
aria-expanded={menu.open}
ref={menu.registerRoot}
```

**Result**: eslint phát hiện 10 lỗi:
```
error: only call react hooks from within a react function component
or custom hook (react-hooks/refs-only-as-dependencies)
error: do not use object prop-spreading in unstable dependencies (react-hooks/refs)
```

### Lý do

React Compiler coi mọi truy cập property của object trả từ hook trong render là đọc `ref.current` — vì hook có thể chứa ref, không có cách nào phân tích tĩnh để chứng minh `menu.open` không phải ref. Luật `react-hooks/refs` bảo vệ quy tắc cấm "read ref outside of effect", nhưng làm quá nhạy.

### Fix

Hai đường:

**A. Destructure tại call site** (chọn này):
```typescript
const { open, activeIndex, registerRoot, registerButton, ... } = useMenuKeyboardNav({ ... });
// Giờ JSX dùng mọi giá trị trực tiếp, không qua object trung gian
aria-expanded={open}
ref={registerRoot}
```

**B. Trả callback chứ không RefObject** — hook lộ `registerRoot: (node: HTMLDivElement | null) => void` thay vì `rootRef: RefObject<HTMLDivElement>`. Giữ ref kín trong hook, mặc dù không bắt buộc (hook nên ẩn cơ chế đó).

**Chọn A.** Commit `70189b4` destructure. Commit `fe81490` trả callback cho registerRoot/registerButton/registerItem. Cả hai xoá lỗi.

**Bằng chứng**: `hooks/use-menu-keyboard-nav.ts` dòng 18-40 định nghĩa MenuKeyboardNav type (object trả về); dòng 160-170 return object. Component `components/login/language-selector.tsx` dòng 30-41 destructure trực tiếp trong hook call. Eslint: 0 error.

### Bài học

Compiler không phân biệt object literal nào có ref vs không — coi toàn bộ object như possible ref holder. Tránh xoay object trả từ hook trong render khi có property access. Destructure ngay tại call hoặc đảm bảo không lưu, chỉ trả callback.

---

## Feature specs gate chưa bao giờ chạy — 49 marker `planned` / `TBD (draft)`

### Vấn đề

Trước khi chạy `/tkm:rebuild-spec --flows` để sinh process-flow, kiểm tra prerequisite: `docs/vi/features/*/technical-spec.md` phải có code source. Thấy `last_feature_spec_run_sha` **rỗng** trong `.rebuild-state.json`.

Đi xem F001/F002 spec: **49 occurrence** của `*(planned)*` (A1/A2/A3 ... không có code yet) + `**Source:** TBD (draft)`. Nhưng code đã ship hôm trước (PR #1). Gate này **không bao giờ chạy**.

### Chạy lần đầu

Commit `5d7f6c5`: `rebuild-spec --feature-specs` (lần đầu):

**Trước:**
```
Action A1 · LoginPage (planned)   ← obsolete
...
Source: TBD (draft)               ← incomplete
```

**Sau:** 
```
Action A1 · LoginPage
(implemented, sourced from app/login/login-client.tsx:31-35, lib/auth/sign-in-with-google.ts:8-22)
```

Commit message: "replacing 49 occurrences of planned / TBD — chưa có source code with verified file:line citations".

`last_feature_spec_run_sha` lúc này: `94a720b` (merge commit trước session này). Mode từ `incremental` → `full`.

**Bài học**: Gate là **preventative** — nó không tự chạy, không ra lệnh code sinh ra. Phải check prerequisite _trước_ pass gate. Đọc `.rebuild-state.json` lúc mở cửa, không phụ thuộc vào upstream gate hay "previously passed". Empty `last_*_run_sha` = "chưa chạy lần nào". Khi dùng rebuild-spec trong quy trình verification, phải ghi rõ: "chạy `--feature-specs`, `--flows` lần nào, kết quả gì".

---

## Mỗi layer verification mù khác nhau

### Validator → Reviewer → Re-reviewer pattern

**Scenario**: Validators (automated, kiểm syntax/schema) chạy trước reviewer (người). Mỗi cái tìm một class defect khác:

1. **Validator pass, reviewer fail**. 5 validator qua sạch. Reviewer đọc F001/F002 technical-spec, tìm 4 critical: F001 table row 9/13 không có back-reference đến Success Criteria (`SC-###`), F002 3/7. Tại sao validator không bắt? Vì validator (regex-based) chỉ check presence/format của `FR-###`, không check **completeness** — rằng mọi FR đều có SC. Người review phải cân bằng; tool chỉ check contour.

2. **Reviewer overruled validator**. `FeatureSpec.dec_lazy_na` validator (tool) flag F001 missing "Decision Logic" section. Reviewer đọc § 3.1 A3 (Authentication Action), thấy `DEC-001`/`DEC-002` inline trong Rule rung — tool syntax check không thấy vì nó kiếm H4 block title `## Decision Logic`, shape này đã deprecated. Tool report false positive; reviewer validate manual.

3. **Re-reviewer → bug ở chỗ validator cũ**. Reviewer viết xong, re-reviewer chạy link-resolution check, tìm `C5` — F002's `System Overview` row trỏ `system/system-overview.md`, thực tế tên file là `overview.md`. Validator không chạy check này (link là dynamic, không phải schema). Re-review lại tìm bug do re-scan mechanical check trên edited file.

4. **Gate emit 0, đó là đúng**. `/tkm:rebuild-spec --flows` sinh **zero flows**. Researcher tự hỏi: có phải thiếu dữ liệu? Đọc gate: 2 entity phải có ≥2 transitions + ≥2 trigger-type. `LoginCopy` (menu) chỉ có 1 transition (VN ↔ EN), `LanguageSelector` (component) 0 trigger type rõ. Gate không thỏa. Quyết không emit; document rõ. Zero không phải defect, nó là gate đúng.

### Bài học chảy máu

Khi nhiều layer verification, mỗi layer **mù một class defect khác**:
- Syntax checker (regex) mù completeness, mù semantic.
- Semantic reviewer mù mechanical link-rot (cần crawler).
- Mechanical re-reviewer mù business rule (gate emit 0).

**Kiến trúc**:
- Validator = contour + syntax.
- Reviewer = semantic + sampling manual.
- Re-reviewer = mechanical re-check (risky, tìm được ít).
- Researcher = gates + logic.

Không có "reviewer check all mạnh hơn validator" hay "gate bắt hết". Chồng lớp, mỗi cái giữ lớp.

---

## Lỗi riêng của tôi: lint check stale

### Vấn đề

Tôi báo cáo gate trước commit `fe81490`: "lint: 0 error, typecheck: 0 error". Qua lệnh `npm run lint`. Lúc ấy `lib/auth/sign-in-with-google.ts` (implementation) đã có, nhưng test file `lib/auth/sign-in-with-google.test.ts` chưa.

Sau khi `tester` viết test file (15 line tính code, không comment), run lại lint → **15 error**:
- `no-explicit-any` (mock helper tapped `as any` rồi cast xong)
- `no-unsafe-argument` (pass mock object vào generic function)
- `prefer-called-exactly-once-with` (vitest matcher, không phải eslint, nhưng tsconfig strict)

### Phục hồi

Tester fix test file: thay `as any` → `as unknown as`, thêm type cho mock helper, loại bỏ redundant assertion. Commit `fe81490` gốc chỉ implement lib file; `tester`-added test file mới gọi là lint clean.

**Rồi tôi chạy lại gate từ HEAD** (sau test file): `npm run lint` → 0 error. Giờ clean.

### Bài học

Gate result chỉ valid cho tree **tại lúc chạy**. Subagent viết file mới → tree thay đổi → old gate stale. Muốn report gate status:
1. Check tree state từng phần tử.
2. Re-run gate **sau** mọi file change.
3. Hoặc note rõ "clean at `sha X`, tree sau đó đã thêm Y file".

Tôi jump conclusion "lint clean" trước khi full tree ổn. Reviewer record "Lint: 0" dựa trên stale check. Phức vụ.

---

## Final State

| Thành phần | Kết quả |
|-----------|---------|
| `tsc --noEmit` | ✓ 0 error |
| `npm run lint` | ✓ 0 error |
| `npm run build` | ✓ 0 error |
| `npm run test:unit` | ✓ 50/50 pass (roving-index: 10, next-path: 24, messages-parity: 2, sign-in-with-google: 6, locale: 8) |
| `npm run test:e2e` | ✓ 28 pass, 2 skip, 0 fail |
| Coverage `lib/**` | 63.87% (lib/auth: 100%, lib/ui: 100%, lib/i18n: 100%, lib/supabase: 49.09%) |

---

## Còn mở (đã xác nhận, không fix vì out of scope)

1. **Shared `useTransition` — locale switch vẫn flip `loginPending`**: Hook `useMenuKeyboardNav` stateless, nhưng call site (`LanguageSelector`) dùng context transition chung với login action. Khi chọn EN → re-render login button disabled. Pre-existing, preserved vì refactor cần behavior-safe. Fix này cần refactor state architecture (outside this session scope).

2. **`SignInWithGoogleOptions.next` unvalidated**: URL redirect target lấy từ param `next`, concatenate vào `redirectTo` rồi truyền `signInWithOAuth`. Không validate. Hiện không reach (hardcode `/todo`), nhưng contract comment thêm vào `lib/auth/sign-in-with-google.ts` dòng 22-25 để sau mở rộng guard nó.

3. **Researcher finding chưa fix**: 
   - `MODEL003_LoginCopy.languageLabel` computed server-side nhưng không đọc (waste).
   - `app/todo/*` source comment cite `US004` không tồn tại.
   - E2E không assert cookie write + re-render outcome của language switch (behavior checked, visual flow no).

---

**Evidence**: commits `dd4ea11` → `70189b4` (hook logic) → `fe81490` (lib/auth + test) → `5d7f6c5` (specs regen); `npm run test:unit:coverage` output; `docs/vi/.rebuild-state.json` before/after; `lib/auth/sign-in-with-google.test.ts` final state; `hooks/use-menu-keyboard-nav.ts` type definition.

**Status:** DONE_WITH_CONCERNS
**Summary:** Hook extraction hit React Compiler freeze (must destructure at call site), unblocked via callback-return pattern. Feature specs gate first run: 49 markers replaced, gate pattern clarified. Verification layer asymmetry confirmed: each catches different defects, none catches all. Stale gate result: lint clean reported before tester added test file with 15 new errors — all fixed, re-check confirmed clean.
**Concerns:** Pre-existing shared `useTransition` leak and unvalidated `next` param left open (behavior-safe but incomplete); 3 researcher findings parked (model waste, ghost cite, incomplete e2e assert).
