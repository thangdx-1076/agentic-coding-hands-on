---
phase: 03
feature: F009
track: A
status: completed
priority: P2
test_policy: e2e-red-first
effort: 1.25h
owner: momorph-ui-implementer
mode: section
file_ownership:
  [
    "src/app/(public)/kudos/_components/kudos-compose-icons.tsx",
    "src/app/(public)/kudos/_components/kudos-link-dialog.tsx",
    "src/app/(public)/kudos/_components/kudos-link-dialog.stories.tsx",
    "src/app/(public)/kudos/_components/kudos-compose-footer.tsx",
    "src/app/(public)/kudos/_components/kudos-format-toolbar.tsx",
  ]
---

# Phase 03 — Track A: `kudos-link-dialog.tsx` + icon extraction

## MoMorph refs
- Addlink Box: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/OyDLDuSGEa (`1002:12917`, instance `1002:12682`)
- Clarifications: `plans/260908-0919-kudos-addlink-box/clarifications.md` · testPolicy: `e2e-red-first`

`mode: section` · `fileKey: 9ypp4enmFmdK3YAFJLIu6C` · `screenId: OyDLDuSGEa` · `projectRoot: /Users/dang.xuan.thang/Desktop/learnings/mock-project/agentic-coding-hands-on` · `outputPath: src/app/(public)/kudos/_components/` · `stack: Next.js 16.3.4 + TS + Tailwind + Storybook (nextjs-vite)` · `testRunner: @playwright/test` · `redTestFiles: ["tests/e2e/kudos-link-dialog.spec.ts"]` · `redCommand: E2E_PORT=3100 pnpm exec playwright test tests/e2e/kudos-link-dialog.spec.ts --reporter=list` · `redExitCode: 1` · `redFailure: 0/11 pass — [data-testid=kudos-link-dialog] not found` · `redEvidence: plans/260908-0919-kudos-addlink-box/evidence/red-evidence.md` · `plannedChecks: typecheck→lint --max-warnings 0→format:check→build-storybook`. **Use Figma design content as mock data source. Do NOT invent data.**

**Visual (từ clarifications, không đoán)**: panel 752×388 bg `#FFF8E1` radius 24 padding 40 gap 32; title Montserrat 32/40 bold `#00101A` left w672; mỗi row (Nội dung/URL) flex gap16 h56 items-center, label 22/28 bold, ô nhập flex-1 h56 border1 `#998C5F` bg white radius8 padding16/24, không render icon `IC`; footer gap24 h60 — Hủy (border `#998C5F`, bg rgba(255,234,158,.10), radius4, padding16/40, gap8, text16/24 bold tracking.15, `IconClose`), Lưu (flex-1/502, h60, bg `#FFEA9E`, radius8, padding16, text22/28 bold, `IconLink`).

1. `kudos-compose-icons.tsx` (mới): export `IconClose` (chép từ `kudos-compose-footer.tsx:87-103`) + `IconLink`+factory `icon()` (chép từ `kudos-format-toolbar.tsx:87-102,125-127`).
2. `kudos-compose-footer.tsx`/`kudos-format-toolbar.tsx`: xoá bản local, import lại từ `kudos-compose-icons.tsx`. Không đổi JSX/testid nào khác (F009 C09/C10 không được vỡ).
3. `kudos-link-dialog.tsx` (mới, `"use client"`, thuần trình bày — mọi state qua props): `<dialog data-testid="kudos-link-dialog" ref={registerDialog} onCancel={onCancel}>`, title `data-testid="kudos-link-title"`, textarea `data-testid="kudos-link-text-input"`, input `data-testid="kudos-link-url-input"` (`onBlur`), 2 error `<p role="alert" data-testid="kudos-link-text-error|kudos-link-url-error">`, nút Hủy `data-testid="kudos-link-cancel"` + Lưu `data-testid="kudos-link-save"` (`type="button"`, **không** `aria-disabled` — luôn bấm được, khác nút Gửi F009).
4. `kudos-link-dialog.stories.tsx`: 3 story (Empty/WithErrors/Prefilled) dùng `defaultKudosComposeCopy.linkDialog`.

Done: L01/L04 lắp props tay khớp; screenshot MCP đối chiếu bảng visual; không còn `IconClose`/`IconLink` trùng lặp 2 nơi.

## Delivered

✓ `kudos-link-dialog.tsx`, `kudos-compose-icons.tsx`, and stories complete. Component uses native `<dialog>`, all 8 testids wired, validation errors render correctly. Icons extracted, no duplication. **Deviations:** Rows use `items-start` instead of original `items-center` to prevent error text misalignment; IC icon not rendered per clarifications (no icon-input hybrid needed). **Proof:** `typecheck && lint --max-warnings 0 && format:check && build-storybook` all exit 0; visual captures 01-04 all MATCH design spec.

## Next
Song song phase 02. Phase 04 nối `KudosLinkDialog` với hook thật.
