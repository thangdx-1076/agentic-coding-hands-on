---
title: "Kudos Addlink Box (F009 revision) — nested `<dialog>` React synthetic onCancel bubbling, evidence gate schema, tester cleanup trap, 11/11 e2e pass"
date: 2026-09-08
time: "09:19 → 10:40"
tags: [momorph, feature-F009-revision, nested-dialog, react-event-bubbling, evidence-gate-schema, tester-cleanup, file-cap]
severity: medium
---

# Tóm tắt

Dialog lồng "Thêm đường dẫn" (Nội dung 1–100, URL http/https 5–2048, Hủy/Lưu) thay thế `window.prompt` ở nút Link trong Viết Kudo. Đặc biệt: React synthetic `onCancel` **bubbles** qua cây component dù native `cancel` event không bubbles (Escape trên dialog lồng đóng cả compose dialog). Fix: `event.stopPropagation()` ở container. 11/11 e2e xanh, 27/27 F009 total. Bài học: tester báo `exitCode 0` nhưng có 1 failed test (C19) do `SUPABASE_SERVICE_ROLE_KEY` không export ở `afterAll` cleanup. Evidence gate schema đòi reshape artifact (6 key study-context.json, temper-results.json structure, inspection-verdict echo criteria verbatim). File cap: extract thin container (hook + error-key→copy map + `registerOpen` imperative) để giữ form 200 dòng.

---

## Bẫy 1: React synthetic onCancel bubbles qua component tree

**Hiện tượng**: Bấm Escape trên dialog "Thêm đường dẫn" → vừa đóng dialog link vừa đóng compose dialog (L02, L10 red). Native `cancel` event không bubbles, nhưng React synthetic event **bubbles qua React tree**.

**Gốc rễ**: Native và React layer khác nhau. Báo cáo research (plans/260908-0919-kudos-addlink-box/reports/researcher-260908-0919-nested-dialog-study.md) viết đúng "native semantics không cần code", nhưng React layer là chỗ sự kiện compound.

**Vá**: `src/app/(public)/kudos/_components/kudos-compose-link-dialog.tsx` ở container's `onCancel` gọi `event.stopPropagation()` → sự kiện dừng tại dialog lồng.

```tsx
function LinkDialogContainer() {
  return (
    <dialog
      onCancel={(e) => {
        e.stopPropagation();  // React synthetic event
        closeDialog();
      }}
    >
      {/* ... */}
    </dialog>
  );
}
```

---

## Bẫy 2: Tester claim exitCode 0, nhưng C19 fail; cleanup skip vì env var không export

**Triệu chứng**: Tester báo `exitCode: 0` trong evidence file, nhưng liệt kê C19 (create kudo check) là "pre-existing". Orchestrator rerun `-g C19` → **red** (thực tế failed).

**Gốc rễ**: `tests/e2e/kudos-compose.spec.ts:804-808` `afterAll` cleanup gọi `clearTestKudos()` chỉ khi `SUPABASE_SERVICE_ROLE_KEY` được export. Không export → cleanup skip → 8 test kudo row tồn tại từ lần trước → `public.kudos` có 20 row (seed 12 + 8 stale) → C19 lấy sai feed card.

Để fix: Orchestrator `docker exec supabase_db_saa-app psql -U postgres -d postgres << 'EOF'` → `DELETE FROM public.kudos WHERE ...` (8 test-user row), rerun 28 passed/1 skipped.

**Evidence file đã sửa**: `plans/260908-0919-kudos-addlink-box/evidence/green-evidence.md § Orchestrator correction`.

Bài học lặp từ F009 hôm trước — **bao giờ tester báo xung đột lợi ích, orchestrator tự kiểm DB + trace, không tin claim trực tiếp**.

---

## Bẫy 3: Evidence gate schema, không phải content

**Triệu chứng**: Lần đầu tiên gửi artifact vào evidence gate (hard stage), bị reject do schema, không phải giá trị:
- `study-context.json` chỉ cho 6 key (topic, commission, scout_date, scout_output, resolution, end_ts) — file gửi thêm field custom.
- `temper-results.json` phải là `{commands: [{command, exitCode, status, summary, ts}]}` — file send object flat.
- `inspection-verdict.md` acceptance entries phải echo criterion từ spec **verbatim** (đi kèm "proven: …") — file viết tóm tắt.
- Findings cần `location: path:NNN` + `disposition` — file thiếu.
- `status: fail` blocking cho đến khi supersede (lưu history ở temper-raw-runs.json + prose).

Reshape tất cả, pass SEALED.

---

## Bẫy 4: File cap discipline — extract thin container

**Hiện tượng**: `kudos-compose-form.tsx` đạt 200 dòng; logic link-dialog wiring tăng thêm ~40 dòng sẽ vượt.

**Vá**: Extract `kudos-compose-link-dialog.tsx` (container mỏng: hook `useKudosComposeLinkDialog`, error-key→copy mapping, `registerOpen` imperative opener). Form giữ 200 dòng, container có 85 dòng.

---

## Pre-existing debt: parse-kudo-markdown truncate href ở `)` đầu tiên

Reviewer defer: `parse-kudo-markdown.ts` (F009 pre-existing) cắt href tại `)`  đầu → Wikipedia URL với parentheses render sai. Không exploitable (scheme whitelist đứng), không ở diff này, để sau.

---

## Lập kế hoạch lần sau

1. **Tester report logic**: claim exitCode phải đi kèm run log hoặc database snapshot. Orchestrator re-verify (psql / trace) trước khi accept conflict claim.
2. **Evidence gate schema**: gate là hardcoded — có bản checklist rõ ràng. Qua lần này, lần sau chỉ pass lần đầu.
3. **Cleanup env var**: `SUPABASE_SERVICE_ROLE_KEY` export trong `beforeEach`, không chỉ test file — hay set toàn project test config nếu không khác e2e.

---

**Evidence**:
- Clarifications: `plans/260908-0919-kudos-addlink-box/clarifications.md` (nested dialog interaction)
- RED: (phase 02 hook test red → green)
- GREEN: 11/11 e2e pass (tests/e2e/kudos.spec.ts `-g 'C[0-9]+'`); F009 total 27/27
- Study: `reports/researcher-260908-0919-nested-dialog-study.md`
- Reviewer: 8/10 (0 critical)
- Footprint: 4 file sở hữu (hook, utils, form, link-dialog) + 2 integration phase

**Status:** DONE
**Summary:** F009 revision "Thêm đường dẫn" nested dialog built (11/11 e2e, 27/27 F009). React synthetic onCancel bubbles — fix stopPropagation(). Tester cleanup trap (env var không export) → 8 stale rows → C19 red. Evidence gate schema (6 key, structure, verbatim criterion echo). File cap: extract thin container. Reviewer 8/10 no critical.
