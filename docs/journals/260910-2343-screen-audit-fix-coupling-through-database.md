---
title: "Audit 8 màn shipped — 3 critical gap, ~25 major, 1 Temper lesson about shared state"
date: 2026-09-10
time: "19:51 → 23:43"
tags: [audit, gap-fix, shared-state-coupling, temper, unit-e2e, kudos, prelaunch, i18n, momorph]
severity: high
---

# Tóm tắt

Kiểm audit 8 màn shipped (Login, Homepage, Award system, Countdown, Language switch, Kudos board, Compose, Like Kudos) ứng với 14 MoMorph web screen: phát hiện 3 critical gap + ~25 major gap. 12 phase vá chúng; 11 done + 1 chưa có e2e. Thứ tự bàn giao:

- **Temper gate** (orchestrator chạy Settled tree): 848 unit (từ 808) + 232 e2e pass/4 skip/0 fail (từ 217/5/0) + full suite **ba lần liên tiếp** (để bắt order-dependent fail).
- **Kết luận chính**: File ownership phân tán không ngăn chặn coupling **qua database** — phase 01 (query distinct từ DB) + phase 03 (write kudo mới) + phase 12 (dùng filter option) chạy song, mỗi cái báo e2e xanh tách biệt (:34/34, ✓), nhưng **lúc chạy full suite rồi, 3 test đỏ**. Temper + manual lock tìm ra.

## Lỗi nặng nhất (3 critical)

1. **Top-10 Sunners nhận quà**: hardcode `giftRecipients=[]` ở `kudos-client.tsx:188-189`. Migration 0011 (`secret_box_openings`) đã có từ lâu; comment `"not yet"` đã lỗi thời.

2. **"Bật EN" vẫn 7 chỗ tiếng Việt**: `messages/en.json` thiếu 7 value (diacritics). Test parity chỉ so tập key → không bao giờ bắt.

3. **Prelaunch lock gate không có e2e**: Redirect khi lock ON chưa từng được test; `playwright.config.ts` không set biến môi trường → hành vi cốt lõi unproven.

Thêm 3 lỗi system:
- 6 assertion tautology (`expect(url()).toContain("/")` — mọi URL chứa `/`)
- Fixme lỗi thời ở kudos compose
- `max_rows = 1000` trong config Supabase bắt cả dữ liệu lọc khi vượt

## Bài học chính — coupling qua shared state (không phải file ownership)

Audit báo cáo: 5 phase song song, file ownership riêng biệt, **không đụng file của nhau**. Mỗi phase chạy `pnpm test:e2e` trong quá trình làm = xanh. Orchestrator lúc Temper chạy full suite → **3 test RED**:

**Lỗi 1 — [C26]/[C34] compose + kudos.**
- **Nguyên nhân**: Phase 03 thêm `sendKudo()` tìm "Test" user rồi `.first()` recipient option. Phase 12 tạo + xoá transient test user cùng lúc. `.first()` chọn user bị xoá mid-submit → dialog không đóng.
- **Fix**: Pin recipient thành "Huỳnh Dương Xuân" (seeded) + `toHaveCount(1)` → fail nếu seed absent.

**Lỗi 2 — [C14] filter hashtag.**
- **Nguyên nhân**: Phase 01 làm filter option = query distinct từ DB (thay vì hardcode). Phase 12 chạy song tạo kudo mới → tag list thay đổi vừa khi [C14] `.first()` chọn option.
- **Fix**: Pin tag = "Dedicated" (seeded) + `toHaveCount(1)`.

**Lỗi 3 — [C23] compose 4 card.**
- **Nguyên nhân**: 4 test (C23-C26) tạo kudo "Award" + "Good work" xong assert `.first()` card. Chúng xác nhận lẫn nhau — tình cờ xanh ở cũ. Phase 03's `sendKudo` expose nó.
- **Fix**: Mỗi test dùng content riêng + `.filter({hasText})` pin card cụ thể.

**Học được**: Shared-state coupling không cần shared-file. Một database query hoặc global object là đủ. File ownership check không thay được end-to-end test trên full tree.

## Sai khác lớn từ orchestrator verification

1. **"Next 16 cho 2 next dev cùng directory"** — agent phase 04 nói đúng, tôi nói sai. Tôi chỉ grep "Ready" rồi kill trước dòng abort in ra. Memory gốc đúng; `.next/dev/lock` khoá theo directory.

2. **Agent tester báo RED sai nhãn**. "7 e2e flake/pre-existing" — sai. 3 lỗi là RED **có chủ ý của phase khác** chạy song; nhãn "flake" = bẫy. Không phase nào được tự tuyên e2e xanh lúc còn phase khác sửa tree.

3. **Audit đếm sai test-case rows**: Agent dùng `wc -l` (đếm newline CSV) = 1007 → sai. CSV parser → **253 rows / 213 spec item** đúng.

## Nhóm công việc vá gap

| Phase | Giải pháp | Status |
|-------|---------|--------|
| 01 | COUNT/DISTINCT chính xác + option filter distinct | done |
| 02 | Top-10 gift recipient: view SECURITY DEFINER + DAL + UI | done |
| 03 | Nút tim: `is_own` boolean + `pending` → disabled | done |
| 04 | Prelaunch lock: e2e riêng `playwright.lock.config.ts` | done |
| 05 | `en.json` purity scan (diacritic) + test bắt được | done |
| 06 | Language selector fidelity (flag, active state, persist) | done |
| 07 | Homepage: nav plural + C1 line + logo 64×60 | done |
| 08 | Countdown: 2 tile/digit (flexible N, không hardcode 2) | done |
| 09 | Awards: caption typography + indicator underline | done |
| 10 | **Dropdown filter styling (panel, scroll, selection, `#` prefix)** | **incomplete — 4 e2e missing** |
| 11 | Compose error borders (4 field red border on invalid) | done |
| 12 | Hashtag message + picker disable at 5 cap | done |

## Hai sai lầm riêng của orchestrator

1. **Viết brief phase 04 vào memory sai claim** (two dev server thing). Sửa lại nhưng để lại dấu vết xấu.

2. **Lần đầu journal-writer sinh entry, bịa 6 path không tồn tại** — tôi verify lại bằng path-exist check (cùng phép đo dùng cho docs), ghi `"Output của agent là draft"` thành bài học, để không ai tin mù quạng lần sau.

## Gate lúc ship (Temper run ba lần)

| Kiểm | Kết |
|-----|-----|
| pnpm typecheck | exit 0 |
| pnpm lint --max-warnings 0 | exit 0 |
| pnpm format:check | clean |
| pnpm test:unit | 848/0 fail |
| pnpm build | ✓ |
| pnpm build-storybook | ✓ |
| pnpm test:e2e (run 1) | 232/4 skip/0 fail |
| pnpm test:e2e (run 2) | 232/4 skip/0 fail |
| pnpm test:e2e (run 3) | 232/4 skip/0 fail |
| pnpm test:e2e:lock | 5/0 fail |
| Two-file e2e (kudos + compose) | 61/0 fail |

## Nợ lại & chưa làm

- **Phase 10 incomplete**: Filter dropdown styling xong code, nhưng 4 e2e assertion chưa viết (out of scope).
- **aria-busy** nút tim lúc gửi — phase 03 deviation; cần mở ownership tới `kudos-card-actions.tsx`.
- **E2E picker-disable** ở 5 hashtag cap — logic code đúng, Storybook có visual, nhưng chưa có script test.
- **Overflow viewport 375px** (5-digit DAYS). Chỉ xảy ở fixture e2e; production safe. Cần screenshot.
- **4 TC Login rỗng** (flag+chevron, button hover shadow, selector hover, default VN).
- **Font "Digital Numbers" chưa resolve** — licensing decision. Fallback `monospace` tạm.
- **9 spec row MoMorph lệch** (code đúng) — cần human `upload_specs`, không tự sửa design source.

## Bài học mang đi

1. **File ownership không chặn coupling qua shared state.** Database query, global object, hay event listener — cùng cách làm bệnh. End-to-end test trên settled tree > file ownership check.

2. **Order-dependent failure là thứ cần detect mụn theo cách cụ thể.** Chạy full suite ba lần liên tiếp; nếu fail random hoặc fail lần thứ hai sau khi pass lần thứ nhất = RED mục tiêu cần fix thực. Chạy lần đầu và pass = chưa chứng minh được gì.

3. **"Process in ra success line" ≠ "process serving".** Phải probe port, `curl -s localhost:PORT`, kiểm HTTP response — không đọc stdout greeting. Tôi ghi memory rõ điểm này để lần sau không lặp.

4. **Spot-check "clean" bằng nằm ở tầm quân.** Đọc 1-2 file = kết luận 100 file? Không. Mechanical check (path-exist, grep-scan, CSV parser) rẻ hơn, mở rộng tới tree, không mệt, bắt được eyeball bỏ lọt.

5. **Output agent là draft.** Cùng phép thử mechanical nên chỉ vào cả output của agent. Journal bịa dữ kiện thì tự phủ định; phải verify trước khi công bố.

6. **Gate chặn = cơ hội để sửa quyết định, không phải xoá gate.** Risk gate reject vì schema = viết lại đúng schema, **giữ phán quyết không đổi**, đợi human ký. Không bypass/delete.

## Artifacts

- `plans/260910-1951-screen-audit-spec-test-gaps/reports/audit-verdict-260910-2015.md` — verdict 8 màn.
- `.../reports/orchestrator-verified-260910-2010.md` — xác minh lại, ghi "`TÔI SAI`" khi sai.
- `.../evidence/temper-results.json` — đầy đủ 11 command, 3 regression + fix, 3 lần e2e liên tiếp.
- `.../reports/inspection-riskgate-260910-2312.md` — migration 0015 privacy + human sign-off.
- `.../plans/action-items.md` § `260910-1951` và `260910-2235` — decisions, deviation, debt.
- `.../plan.md` + 12 `phase-*.md` — mô tả, sequence, effort.

Commit 12 phase: todo.
Branch: `fix/screen-audit-spec-test-gaps` (off `origin/main` @ aeb207c).

## Tiếp theo

1. Hoàn thành phase 10 (4 assertion e2e cho filter dropdown).
2. Human sign-off `riskGate.humanSignedOff: true` cho migration 0015 (privacy).
3. Chạy full e2e lần 4 để chứng phase 10 + 0015.
4. Open PR, merge.
