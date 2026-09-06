---
title: "226+ files moved, route groups added, lint boundaries sealed — refactor sealed but riskGate blocks ship until human sign-off"
date: 2026-09-06
time: "11:50 → 15:00"
tags: [refactor, structure, nextjs, colocation, src-layout, eslint-boundaries]
severity: high
---

# Tóm tắt

5 commit từ `aca6e8e` (Phase 1–3 + review fix + docs) lên `6248003`. 226+ file di chuyển (git mv) từ root `app/`, `components/`, `hooks/`, `lib/`, `mocks/` vào `src/`. Tái cấu trúc `src/app` thành `(public)/(home)` và `(protected)/(todo)` route group. Tách `lib/` theo kind → `src/api/`, `src/dal/`, `src/lib/`, `src/utils/`. Thêm ESLint boundary rule chặn segment import ngang/xuống. **Tất cả gate xanh** (lint, format, unit 100% trên 18 file, Storybook 22 story, e2e 46 + @auth 9, build, typecheck). Review: 9/10, 0 critical. **Nhưng riskGate lock ship** vì auth gate chuyển sang `src/app/(protected)/layout.tsx` + `src/dal/auth.ts` — cần ký con người trước `/tkm:ship`.

---

## Điều gì hỏng / gây kinh hãi

### Phase 1 split map sai: layout di chuyển mà route tree ở root
**Triệu chứng**: Migration map bảo "PR 1 move layout", PR 2 move app tree. Khi commit sạch, Next vẫn render từ root `app/`, `src/app` bị bỏ qua.
**Nguyên nhân**: Next rule: nếu cả `app/` (root) và `src/app` tồn tại, Next chỉ scan root. Layout không di chuyển xong → route tree không thấy.
**Fix**: Phase 1 **phải** move toàn bộ `app/` cùng lúc với config. Không tách được.
**Bài học**: Framework precedence phải verify vs doc trước khi split move thành phase.

### YAGNI vs skill spec: bốn consumer nhưng planner thấy một
**Triệu chứng**: Planner ghi "createClient() dùng ở layout, YAGNI tạo getCurrentUser()". Phase 3 test chạy, phát hiện 4 chỗ: layout, home, login, todo cần getCurrentUser().
**Nguyên nhân**: Planner đếm chỗ ghi explicit, miss 3 chỗ gọi từ `layout.tsx` propagate.
**Fix**: Orchestrator thêm `src/dal/auth.ts getCurrentUser()` vào Phase 3, chứ không fork Phase 3 để fix.
**Bài học**: Đếm consumer trước gọi YAGNI. Skill rule 4 nói "page/layout read through dal" — chính chú thích luôn.

### Subagent blocked bởi .skignore hook
**Triệu chứng**: Implementer không chạy được `pnpm build` hoặc `pnpm typecheck` — orchestrator chạy sau mỗi phase rồi commit.
**Nguyên nhân**: Hook `.skignore` chặn token `build` và path `.next/`, `node_modules/`, `coverage/`.
**Bài học**: Plan gate ownership quanh hook. Build phải chạy trước typecheck (Next sinh `.next/types`).

### ESLint no-restricted-imports: group không express "sibling but not ancestor"
**Triệu chứng**: Cần chặn `home/header` import từ `login/`, nhưng gitignore-glob không có extglob để loại ancestor.
**Fix**: Dùng `regex` option với negative lookahead. Implementer probe hai rule cắn rồi revert.
**Bài học**: Prove lint rule bites trước trust. 2 deliberate violation + revert = confidence.

### File size: tester báo 3 file >200 dòng
**Triệu chứng**: Static check flag `use-menu-keyboard-nav.test.ts` 382 dòng, `home.spec.ts` 700, `login.spec.ts` 713.
**Nguyên nhân**: Base-identical + 2 untouched e2e spec cũ. Refactor không làm dài thêm.
**Fix**: Ghi vào `action-items.md` nợ lại, không forge xanh.
**Bài học**: Evidence discipline: skip check với reason + debt record.

### Reviewer verdict keys sai schema
**Triệu chứng**: Tester report keys `title`/`fix`, reviewer prompt copy vào `findings[]` → schema reject.
**Fix**: Rewrite verdict, key đúng: `severity`/`category`/`location`/`summary`/`disposition`.
**Bài học**: Schema check là gate, không phải suggestion.

---

## Dữ liệu

**Commit**: 5 commit `f9e6e33` (move src) → `1f83396` (group) → `580e45f` (lib split + lint + docs) → `fd445a5` (proxy fix) → `6248003` (system doc).
**Files**: 226+ di chuyển. 18 coverage file (100%). 22 Storybook story. E2E 46 + @auth 9.
**Gate**: lint ✓ format ✓ unit 100% ✓ storybook 22 ✓ e2e 46/46 ✓ @auth 9/9 ✓ build ✓ typecheck ✓.
**Review**: 9/10. 0 critical. 1 warning (proxy docblock, sửa ✓). 1 debt (5 file >200, ghi debt). 1 suggest (reject).
**Risk**: `touchesSensitiveArea: true` vì auth gate chuyển. `signoffRequired: true`. `humanSignedOff: false` — chặn ship.

---

## Quyết định

- Phase 1 di chuyển toàn bộ `app/` cùng lúc (không tách được với Next rule).
- Thêm `src/dal/auth.ts` cho 4 consumer (layout, home, login, todo).
- ESLint dùng `regex` no-restricted-imports + negative lookahead (chứ không `group`).
- Debt log thay forge: 5 file >200 là base sẵn, không lỗi refactor.
- `spec_waived: true` (0 intent user-facing mới, không cấp F###).
- Doc-writer đối soát `architecture.md` + `permissions.md` từ forward draft đã xác minh.

---

**Status:** DONE_WITH_CONCERNS
**Summary:** Src layout refactor 226+ file, 3 phase, tất cả gate xanh. Review 9/10. Chỉ riskGate chặn (auth sensitive, cần ký con người). Lesson: framework rule > split strategy; 4 consumer > YAGNI.
**Path:** `/Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on/docs/journals/260906-1150-src-route-colocation-refactor.md`
