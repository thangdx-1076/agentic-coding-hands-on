---
feature: F000
phase: 06
title: "Cổng kiểm chứng full-suite + đồng bộ docs"
status: pending
priority: P2
effort: 1h
test_policy: e2e-red-first
depends_on: [05]
owns:
  - docs/project-changelog.md
  - docs/development-roadmap.md
  - plans/260908-1337-secret-box-modal/reports/
---

# Phase 06 — Cổng kiểm chứng + đồng bộ docs

```
## MoMorph refs:
- Secret Box modal: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/J3-4YFIpMM
- Clarifications: plans/260908-1337-secret-box-modal/clarifications.md
- testPolicy: e2e-red-first
```

**test_policy: e2e-red-first.** Phase này chỉ **chạy** và **ghi lại**. Không sửa một dòng test nào,
không sửa `src/` để "làm xanh" — test đỏ ở đây có nghĩa quay lại phase tương ứng.

## Context Links

- [`plan.md`](./plan.md) · các phase 01–05
- [`reports/tester-260908-1414-red-evidence.md`](./reports/tester-260908-1414-red-evidence.md) — RED để đối chiếu GREEN
- [`evidence/study-context.json`](./evidence/study-context.json) — 13 acceptance criteria phải tick hết
- [`spec/system/permissions.md`](./spec/system/permissions.md) + [`architecture.md`](./spec/system/architecture.md) — draft đối chiếu as-built
- `~/.claude/rules/documentation-management.md` — luật cập nhật changelog/roadmap

## Overview

- **Priority:** P2 · **Status:** pending · **Effort:** 1h · **Depends on:** phase 05
- Chạy **toàn bộ** cổng chất lượng, ghi exit code thật, đối chiếu 13 acceptance criteria, ghi
  changelog + roadmap, và ghi lại 2 sai lệch so với spec draft (D-P02, D-P04) để promote không bị lệch.

## Key Insights

1. **CI xanh không chứng minh feature này.** `ci.yml:212` chạy `--grep-invert "@auth|@local-db"` →
   trong 14 test của `secret-box.spec.ts`, CI chỉ chạy **S15**. Bằng chứng thật phải là lần chạy
   local với `saa-app` sống. Ghi rõ điều này trong evidence, đừng để người đọc PR hiểu sai.
2. **Đo full suite, không đo lẻ 1 file.** `secret-box.spec.ts` xanh mà `kudos.spec.ts`/
   `standards.spec.ts` đỏ vẫn là thất bại. Bảng dưới liệt kê 4 lệnh phải chạy.
3. **Spec draft có 2 chỗ as-built lệch** — phải ghi lại, không im lặng: technical-spec § 5.2 giả
   định promote `SECRET_BOX_BADGES` (D-P02: **không** promote), và § 3.1 A3 không nói gì về
   revalidate (D-P04: **cấm** revalidate, kèm lý do test-shaped). Ghi vào evidence để bước promote
   sửa spec theo as-built.
4. **§ 5.3 của technical-spec có 2 câu hỏi giờ đã trả lời được:** Q1 (en.json parity 6 badge key) →
   **đã verify có đủ**; Q2 (hình dạng thật của `.rpc()`) → phase 02/04 đã quan sát. Ghi câu trả lời.

## Requirements

- **FN:** 13 acceptance criteria của `study-context.json` được tick từng dòng, mỗi dòng kèm lệnh
  hoặc query chứng minh.
- **FN:** báo cáo GREEN đặt tại `plans/260908-1337-secret-box-modal/reports/`, đặt tên
  `tester-<YYMMDD-HHMM>-green-evidence.md` (do người/agent chạy tạo — phase này chỉ định nghĩa nội dung).
- **FN:** `docs/project-changelog.md` + `docs/development-roadmap.md` cập nhật theo
  `documentation-management.md`.
- **NFN:** exit code ghi **thật**, không tô hồng. Test đỏ ⇒ ghi đỏ + phase phải quay lại.
- **NFN:** không sửa `src/`, không sửa `tests/`, không sửa `supabase/` ở phase này.

## Architecture

Bảng cổng phải chạy (theo thứ tự, ghi exit code từng dòng):

| # | Lệnh | Kỳ vọng |
|---|---|---|
| 1 | `pnpm typecheck` | exit 0 |
| 2 | `pnpm lint` | exit 0 |
| 3 | `pnpm test:unit` + `pnpm test:unit:coverage` | exit 0, coverage không tụt |
| 4 | `pnpm run test:e2e tests/e2e/secret-box.spec.ts` | exit 0, **14 passed** |
| 5 | `pnpm run test:e2e tests/e2e/kudos.spec.ts` | exit 0 |
| 6 | `pnpm run test:e2e tests/e2e/profile.spec.ts` | exit 0, diff file **rỗng** |
| 7 | `pnpm run test:e2e tests/e2e/standards.spec.ts` | exit 0 (chứng minh D-P02 không chạm `/standards`) |
| 8 | `pnpm exec playwright test` (full, local, `saa-app` sống) | exit 0 |
| 9 | `pnpm exec playwright test --grep-invert "@auth\|@local-db"` | exit 0 (mô phỏng CI) |
| 10 | `pnpm build` | exit 0 |

Bằng chứng bảo mật (psql, bổ sung cho phase 02):

| Kiểm | Query / hành động | Kỳ vọng |
|---|---|---|
| RLS đọc | vai `authenticated` mạo danh user X `select * from secret_box_openings` | chỉ dòng của X |
| RLS ghi | cùng vai, `insert into secret_box_openings` | permission denied |
| anon | `set role anon; select * from open_secret_box();` | permission denied |
| Chống giả mạo | sửa live count trong DevTools rồi bấm box khi hết entitlement | `no_boxes_left`, `count(*)` không tăng |
| Đua | 2 tab bấm box cùng lúc khi còn 1 hộp | đúng 1 dòng ghi thêm |

## Related Code Files

**Modify:** `docs/project-changelog.md`, `docs/development-roadmap.md`

**Create:** `plans/260908-1337-secret-box-modal/reports/tester-<YYMMDD-HHMM>-green-evidence.md`

**KHÔNG chạm:** toàn bộ `src/`, `tests/`, `supabase/`, `messages/`, `public/`

## Implementation Steps

1. `supabase start` từ repo root (không `db reset`). Xác nhận `0011` applied.
2. Kiểm process nào giữ `:3000` **trước khi** chạy e2e — dev server cũ sẽ làm e2e đo code cũ. Không
   kill port bừa; nếu cần, dùng cửa riêng `E2E_PORT=3100`.
3. Chạy 10 cổng theo bảng, ghi exit code + số passed/failed **thật** từng lệnh.
4. Chạy 5 kiểm bảo mật bằng psql / tay.
5. Viết báo cáo GREEN: đối chiếu từng test S01–S13 + S15 với bảng RED của
   `tester-260908-1414-red-evidence.md` (RED → GREEN), 13 acceptance criteria (verbatim từ
   `study-context.json`), 5 bằng chứng bảo mật, và tuyên bố rõ "CI chỉ phủ S15".
6. Ghi mục as-built lệch spec: D-P02, D-P04, cộng câu trả lời cho technical-spec § 5.3 Q1/Q2.
7. Cập nhật `docs/project-changelog.md` (feature mới, `/kudos` Secret Box, migration `0011`,
   `.rpc()` đầu tiên của repo) và `docs/development-roadmap.md` (trạng thái phase/milestone).
8. Ghi `Docs impact: minor|major` vào báo cáo. Nếu `docs/vi/system/permissions.md` +
   `architecture.md` cần delta thật, **không** sửa ở phase này — chuyển cho `doc-writer` ở promote,
   ghi vào Next Steps của báo cáo.
9. Ghi 3 Open Questions còn treo (tiêu đề INFERRED, nút `/profile`, `BadgeCollection`) vào phần cuối
   báo cáo để không thất lạc.

## Todo List

- [ ] `supabase start` (repo root), `0011` applied, KHÔNG `db reset`
- [ ] Kiểm chủ sở hữu `:3000` trước khi chạy e2e
- [ ] Chạy 10 cổng, ghi exit code thật từng lệnh
- [ ] 5 kiểm bảo mật (RLS đọc/ghi, anon, giả mạo, đua) có output thật
- [ ] Báo cáo GREEN: bảng RED→GREEN cho S01–S13 + S15
- [ ] Tick 13 acceptance criteria **verbatim** từ `study-context.json`, mỗi dòng có bằng chứng
- [ ] Ghi rõ "CI chỉ phủ S15" trong báo cáo
- [ ] Ghi as-built lệch spec: D-P02, D-P04
- [ ] Trả lời technical-spec § 5.3 Q1 (en parity: có đủ) + Q2 (hình dạng `.rpc()` thật)
- [ ] Cập nhật `docs/project-changelog.md`
- [ ] Cập nhật `docs/development-roadmap.md`
- [ ] Ghi `Docs impact: …` + 3 Open Questions còn treo

## Success Criteria

- 10/10 cổng exit 0, có ghi output thật (không viết lại từ ký ức).
- `secret-box.spec.ts`: **14 passed**, khớp 1-1 với 12 RED + 2 PASS của báo cáo RED.
- 5/5 kiểm bảo mật đạt, có output psql kèm.
- 13/13 acceptance criteria của `study-context.json` tick, mỗi dòng dẫn được về một lệnh/query cụ thể.
- `git diff --name-only` của phase này **chỉ** chứa `docs/*.md` và file báo cáo trong `plans/`.
- Báo cáo có mục as-built lệch spec (2 mục) và mục Open Questions (3 mục).

## Risk Assessment

| Risk | L | I | Countermove |
|---|---|---|---|
| Báo GREEN dựa trên chạy lẻ 1 file, tưởng cả suite xanh | **High** | High | Bảng 10 cổng bắt buộc, gồm cả full suite và mô phỏng CI |
| Đọc CI xanh thành "feature đã verify" | **High** | Med | Cổng #9 tách riêng khỏi #8; báo cáo phải ghi rõ CI chỉ phủ S15 |
| Dev server cũ trên `:3000` ⇒ evidence nói dối | Med | High | Bước 2 bắt kiểm trước; `E2E_PORT=3100` nếu cần |
| Sửa `src/` ở phase này để chữa test đỏ | Med | High | Ownership của phase chỉ có `docs/` + `plans/reports/`; đỏ ⇒ quay lại phase 01/03/04/05 |
| Bỏ quên as-built lệch ⇒ promote ghi spec sai | Med | Med | Todo tường minh 2 mục D-P02/D-P04 |
| Chạy `supabase db reset` để "cho sạch trước khi đo" | Low | **Critical** | Cấm ở bước 1 + plan.md; đo trên instance đang có dữ liệu là đúng ý đồ |
| Test đua/giả mạo bị bỏ vì "khó chạy tay" | Med | High | Đây chính là FR-601/BR-003, phần *duy nhất* e2e không phủ hết — không được bỏ |

## Security Considerations

- 5 kiểm bảo mật là phần kiểm chứng chính của FR-601/BR-003 — e2e không mô phỏng được 2 session
  Postgres đua nhau, nên psql là bằng chứng bắt buộc, không phải bổ sung.
- Không dán `SERVICE_ROLE_KEY`, `access_token`, hay chuỗi kết nối vào báo cáo. Chỉ dán kết quả.
- Xác nhận `secret_box_openings` không lộ cho `anon` (bảng mới **anon-readable cho tới khi bị REVOKE**).
- Không commit output có email test thật nếu chứa dữ liệu người dùng — dữ liệu e2e là email
  `@secret-box-e2e.dev`, an toàn để dán.

## Next Steps

- Bàn cho promote: cấp F###, đăng ký `SecretBoxOpening` + DISC-001 vào `docs/generated/entities.md`,
  merge 2 system draft, và sửa spec theo as-built (D-P02, D-P04).
- 3 Open Questions còn treo chuyển thành việc cần **người** quyết (tiêu đề INFERRED, nút `/profile`,
  `BadgeCollection`) — đưa vào `plans/action-items.md` mục "Tôi cần làm" ở bước Delivery.
- **Rollback:** phase này chỉ ghi docs/report; `git checkout -- docs/` là đủ.
