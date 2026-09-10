---
title: "Vá 3 lỗi critical + ~25 major từ audit 8 màn hình"
description: "Nối dây Top-10 nhận quà, bỏ trần 1000 dòng, dịch nốt en.json, dựng e2e cho lock prelaunch, vá fidelity 5 màn — 11/12 phase xong; phase 10 còn thiếu 4 assertion e2e cho phần styling. Kết: 848 unit + 232 e2e xanh (baseline 808 + 217)."
status: in_progress
priority: P1
effort: 27h
branch: fix/screen-audit-spec-test-gaps
tags: [audit, gap-fix, kudos, i18n, e2e, supabase, momorph]
created: 2026-09-10
spec_draft: plans/260910-1951-screen-audit-spec-test-gaps/spec/
---

# Vá gap sau audit 8 màn hình

Thứ tự thắng của nguồn: `reports/orchestrator-verified-260910-2010.md` (mục **BÁC BỎ** thắng mọi
report agent) → `spec/` → `reports/audit-verdict-260910-2015.md` → `research/audit-*.md` → `momorph/`.
Baseline: `reports/baseline-260910-1951.md`.

**Rào cứng mọi phase:** 808 unit / 83 file + 217 e2e (5 skip) giữ xanh; `pnpm typecheck`,
`pnpm lint --max-warnings 0`, `pnpm format:check` sạch; file code ≤ 200 dòng; vị trí file theo
`.claude/skills/nextjs-route-colocation-architecture/SKILL.md`.

## Phase

| # | Phase | Track | test_policy | Feature | Effort | Status |
|---|---|---|---|---|---|---|
| 01 | [Kudos aggregates: COUNT chính xác + option lọc distinct](phase-01-kudos-board-aggregates.md) | B | e2e-red-first | F007 | 3h | done |
| 02 | [Top-10 SUNNER nhận quà: view + DAL + nối dây](phase-02-gift-recipients-wiring.md) | B | e2e-red-first | F007 | 3h | done |
| 03 | [Nút tim: cờ `is_own` + trạng thái đang gửi](phase-03-heart-is-own-and-pending.md) | B | e2e-red-first | F008 | 3h | done |
| 04 | [Cổng redirect prelaunch: e2e khi lock BẬT](phase-04-prelaunch-lock-e2e-gate.md) | B | e2e-red-first | F011 | 2.5h | done |
| 05 | [`en.json` hết tiếng Việt + parity test bắt được](phase-05-en-json-purity-and-parity-guard.md) | B | e2e-red-first | F002 | 1.5h | done |
| 06 | [Bộ chọn ngôn ngữ: cờ theo locale, item active, persistence e2e](phase-06-language-selector-fidelity.md) | A | e2e-red-first | F002 | 2.5h | done |
| 07 | [Trang chủ: nhãn nav số nhiều, dòng C1 thiếu, logo 64×60](phase-07-homepage-copy-and-logo.md) | A | e2e-red-first | F003 | 2h | done |
| 08 | [Countdown: 2 hộp chữ số/đơn vị + viết lại hợp đồng e2e](phase-08-countdown-two-box-tiles.md) | A | e2e-red-first | F011 | 2.5h | done |
| 09 | [Awards: typography caption + indicator underline + hover](phase-09-awards-screen-fidelity.md) | A | visual-contract | F004 | 1.5h | done |
| 10 | [Dropdown lọc Kudos: panel, cuộn, item chọn, tiền tố `#`](phase-10-kudos-filter-menu-fidelity.md) | A | visual-contract | F007 | 2h | **incomplete** |
| 11 | [Compose: viền đỏ khi lỗi trên 4 field](phase-11-compose-error-borders.md) | A | e2e-red-first | F009 | 1.5h | done |
| 12 | [Compose: thông báo 5 hashtag đúng nhịp + disable picker](phase-12-compose-hashtag-limit.md) | B | e2e-red-first | F009 | 2h | done |

## Thứ tự & nhóm song song

```
đợt 1 (song song):  01 · 04 · 05 · 09 · 11
đợt 2 (song song):  02(←01) · 06(←05) · 07(←05) · 12(←11)
đợt 3 (song song):  03(←02) · 08(←07)
đợt 4:              10(←01,03)
```

Lý do sequence (không phải sở thích):

- **Migration**: 01→`0014`, 02→`0015`, 03→`0016`. Mới nhất trong repo là `0013_notification_emitters.sql`
  — **KHÔNG** phải `0011` như brief ghi. Land lệch thứ tự ⇒ đánh số lại trước khi commit.
- **DB trước UI tiêu thụ**: 01 trước 10 (danh sách option hết trần cứng ⇒ panel buộc phải cuộn);
  03 (`is_own` trên view F007) trước mọi UI đọc cột đó.
- **File tranh chấp** — chuỗi sở hữu, 2 phase song song không bao giờ cùng sở hữu 1 file:
  `messages/en.json` 05→07 · `messages/vi.json` chỉ 07 · `src/dal/kudos.ts` 01→02 ·
  `kudos/page.tsx` 01→02 · `kudos-client.tsx` 02→03 · `tests/e2e/kudos.spec.ts` 02→03→10 ·
  `home.spec.ts` 07→08 · `kudos-compose.spec.ts` 11→12 · `login.spec.ts` chỉ 06 ·
  `prelaunch.spec.ts` chỉ 08 (04 chỉ tạo file MỚI `prelaunch-lock.spec.ts`).
- 08 gộp markup 2-hộp VÀ viết lại assertion `\d{2,}` ở `home.spec.ts` + `prelaunch.spec.ts` —
  tách ra là hợp đồng e2e vỡ giữa 2 phase.

## Phụ thuộc ngoài & việc của người

- **Promote gate**: `spec/` thiếu `feature-list.md` ⇒ `rebuild-spec` nhận dạng SINGLE thay vì SYSTEM
  (`spec-state-registration.md:28`). Thêm file đó (5 dòng, cả 5 đã có `fcode` ⇒ `#new == 0`) trước
  Stage 0, hoặc promote từng folder. `spec/system/permissions.md` là **system-doc delta**, không đi
  qua vòng lặp feature — cần pass system-doc riêng.
- **F004** (phase 09) và **F009** (phase 11/12) không có spec revision trong `spec/` — nguồn chốt là
  CSV MoMorph + audit + docs đã ship.
- Font `Digital Numbers`: BLOCKED, license là quyết định của người. Phase 08 giữ fallback `monospace`.
- `upload_specs` 9 dòng design lệch, và mở rộng seed phòng ban (`0008` chỉ có `CEVC10`/`CEVC20`):
  việc của người. Hệ quả: không test nào chứng minh danh sách option ĐẦY ĐỦ trên dữ liệu thật
  (F007 D005) — phase 01 chốt bằng contract truy vấn, không bằng dữ liệu.

## Ngoài phạm vi

`rankUps` · ~50 gap minor · pan/zoom Spotlight · `+2 hearts special day` · TC-014 admin moderation ·
`loadMoreKudos` 3 query · `insert-markdown-marker` không bỏ format.
