---
phase: 08
feature: F006
track: —
status: completed
priority: P1
test_policy: e2e-red-first
effort: 1.5h
owner: tester
file_ownership: ["tests/e2e/profile.spec.ts"]
---

# Phase 08 — Temper: GREEN e2e, visual, regression

## MoMorph refs

- Profile bản thân: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/3FoIx6ALVb (frame `362:5037`, 1440×4660, bg `#00101A`)
- Clarifications: `plans/260907-1224-profile-page/clarifications.md`
- testPolicy: `e2e-red-first`

## Context Links

- `evidence/red-evidence.md` — bằng chứng RED của phase 01 (`redCommand`, `redExitCode`, `redFailure`)
- `phase-01-red-e2e-profile-contract.md` § Requirements — bảng C1-C18
- `spec/F006_ProfilePage/technical-spec.md` § 5.1 — SC-001…SC-011 (checklist tester)
- `plans/260907-0935-standards-rules-page/phase-06-temper-green-e2e-visual.md` — khuôn phase temper
- `.github/workflows/ci.yml` — 2 chỗ `--grep-invert "@auth|@local-db"`

## Overview

**Priority**: P1 · **Status**: pending · **Owner: `tester`**
**Goal (1 dòng)**: Chạy **cùng một lệnh** đã cho RED ở phase 01, lần này GREEN; xác nhận bằng mắt trên 3 viewport; và chứng minh 4 trang cũ không bị phase 02 làm vỡ.

## Out of scope

- **Không** sửa file nào trong `src/` — thấy lỗi thì trả bounded fix về đúng owner (UI → `momorph-ui-implementer`; hành vi/route → `implementer`; migration → phase 03 owner).
- **Không** nới lỏng/xoá assertion để làm test xanh. Test đỏ vì code sai là kết quả hợp lệ của phase này.
- **Không** sửa `ci.yml` — tag `@auth` đã được `--grep-invert` xử ở cả 2 chỗ.
- **Không** commit `.playwright-mcp/`, `test-results/`, `playwright-report/`.

## Key Insights

- ✅ **GREEN từ CÙNG lệnh RED.** Chạy `redCommand` nguyên văn từ `evidence/red-evidence.md`.
- ✅ **Preflight 3 việc bắt buộc**: (1) `supabase start` từ repo root, **không** `db reset`; (2) `supabase migration up` verify `profile_cards` tồn tại; (3) `lsof -ti:3000 | xargs -r kill -9`.
  - **Data trap fix (từ phase 01)**: `sign-in.ts` gửi `options: { data: metadata }` — khái niệm SDK không phải REST API. Fixed: top-level `data: metadata`. RED đã xanh, 22/22 test pass.
  - **Stale dev server gotcha**: `reuseExistingServer: true` phục vụ build cũ, test trông flaky trong khi code đúng. Giết `:3000` bắt buộc.
- ✅ **Chẩn đoán 3 kiểu đỏ**: (1) URL → `/login` = Supabase down; (2) Chỉ nhánh other → 404 = migration chưa `up`; (3) Text diff = i18n lệch.
- ✅ **Vacuous tests fixed**: C12 và C16 ban đầu pass mà không test được (không trigger failure). C12 (404 assertion) lệch lỗi endpoint, C16 (network response scan) nhầm filter. **Fixed**: C12 → assert `response.status()`, C16 → `page.on("response")` lọc `profile_cards` đúng. Toàn 22 test xanh nay đều có khả năng phát hiện failure thật.
- ✅ **`.playwright-mcp/` phải xoá trước format gate** — screenshot lọt vào cây.
- ✅ **Cuộl hết trang trước chụp** — trang 4660px, ảnh lazy.
- ✅ **Phase 02 rủi ro hồi quy lớn nhất** — 4 spec cũ phải xanh.
- ✅ **CI chỉ chạy 1 test** (C17). Ghi vào evidence thẳng.

## Requirements

- `pnpm test:e2e tests/e2e/profile.spec.ts --reporter=list` **exit 0**, đủ số test của phase 01, **không test nào `.skip`**.
- 4 spec cũ (`home`, `awards`, `standards`, `login`) xanh, số test không giảm.
- Gate đầy đủ: `pnpm test:unit:coverage` (100% allowlist) · `pnpm lint --max-warnings 0` · `pnpm format:check` · `pnpm build` → `pnpm typecheck` · `pnpm build-storybook`.
- Visual: 3 viewport × 2 nhánh (self / other), ảnh lưu trong plan dir.
- `evidence/green-evidence.md` ghi `redCommand` (nguyên văn từ phase 01), `greenExitCode`, số test chạy/đỏ, và câu về giới hạn CI.

## Architecture

```text
PREFLIGHT
  supabase start (repo root)  →  supabase migration up  →  verify 0005 áp dụng
  lsof -ti:3000 | xargs -r kill -9
  rm -rf .playwright-mcp/

GREEN
  pnpm test:e2e tests/e2e/profile.spec.ts --reporter=list      ← đúng redCommand

REGRESSION
  pnpm test:e2e tests/e2e/{home,awards,standards,login}.spec.ts
  pnpm test:unit:coverage · lint · format:check · build · typecheck · build-storybook

VISUAL (Playwright MCP)
  1440 / 768 / 375  ×  { /profile , /profile?id=<other> }
  cuộn hết trang trước mỗi lần chụp  →  visual-{w}-{self|other}.png

SECURITY RECHECK
  information_schema: cột view = 3 · grant có authenticated, KHÔNG có anon
  curl anon key → profile_cards phải bị từ chối
```

## Related Code Files

**Create**: `evidence/green-evidence.md`, `visual-{1440,768,375}-{self,other}.png`
**Modify**: `tests/e2e/profile.spec.ts` *(chỉ khi phát hiện assertion sai — phải ghi lý do vào evidence, tuyệt đối không nới lỏng để làm xanh)*
**Delete**: `.playwright-mcp/` (trước format gate)
**Chỉ đọc**: toàn bộ `src/`

## Implementation Steps

1. Preflight đủ 3 việc: `supabase start` (repo root, **không** `db reset`), `supabase migration up`, giết `:3000`.
2. Xác nhận `0005` đã áp dụng: `supabase db query "select count(*) from public.profile_cards"` trả số, không lỗi `relation does not exist`.
3. Đọc `evidence/red-evidence.md`, chạy **nguyên văn** `redCommand`. Ghi exit code.
4. Đỏ → chẩn theo 3 kiểu ở Key Insights → **trả bounded fix về đúng owner**, không tự sửa `src/`. Nhận lại rồi chạy lại từ bước 3.
5. Regression: 4 spec cũ + toàn bộ gate (`test:unit:coverage`, `lint`, `format:check`, `build`, `typecheck`, `build-storybook`) đúng thứ tự `build` → `typecheck`.
6. Visual: 3 viewport × 2 nhánh. **Cuộn hết trang trước mỗi lần chụp.** Đối chiếu với frame `362:5037`: hero full-bleed + avatar tròn đè mép, 6 ô badge xám căn giữa 1 hàng, tiêu đề dưới hàng ô, panel thống kê tối bo góc căn giữa, heading `KUDOS` vàng.
7. `rm -rf .playwright-mcp/` rồi chạy lại `pnpm format:check`.
8. Security recheck: 3 lệnh ở khối SECURITY RECHECK. Bất kỳ cái nào lệch → **chặn**, trả về phase 03.
9. `evidence/green-evidence.md`: `redCommand` nguyên văn · `greenExitCode` · số test chạy / đỏ / skip · kết quả 4 spec regression · đường dẫn 6 ảnh · **1 câu nói rõ CI chỉ chạy 1 test của file này**.
10. Ghi `plans/action-items.md` (append): mục "Tôi cần làm" (nếu có), "Decisions" (2 chuỗi i18n chốt ở phase 04, nếu chưa xác nhận được với design), "Nợ lại" (10 TC hoãn F007+; `docs/vi/system/permissions.md` chưa merge delta F006; RISK-02 department/tier/stars chờ quyết định sản phẩm).

## Todo List

- [ ] `supabase start` (repo root), **KHÔNG** `db reset`
- [ ] `supabase migration up` + verify `profile_cards` tồn tại
- [ ] Giết `:3000`
- [ ] Chạy nguyên văn `redCommand` → GREEN, ghi exit code
- [ ] Đỏ thì chẩn theo 3 kiểu, trả bounded fix về đúng owner (không tự sửa `src/`)
- [ ] Regression 4 spec cũ, số test không giảm
- [ ] Gate: coverage · lint · build · typecheck · storybook
- [ ] Visual 3 viewport × 2 nhánh, cuộn trước khi chụp
- [ ] `rm -rf .playwright-mcp/` rồi `pnpm format:check`
- [ ] Security recheck: 3 cột · grant không có `anon` · anon key bị từ chối
- [ ] `evidence/green-evidence.md` đủ trường + câu giới hạn CI
- [ ] Append `plans/action-items.md`

## Success Criteria

- ✅ `pnpm test:e2e tests/e2e/profile.spec.ts` → **22/22 passed, exit 0**, 0 skip.
- ✅ 4 spec e2e (`home`, `awards`, `standards`, `login`) → **81 passed, 3 skipped**, số không giảm.
- ✅ `pnpm test:unit:coverage` → 175 tests, 28 files, **100%** allowlist.
- ✅ `pnpm lint --max-warnings 0`, `pnpm format:check`, `pnpm build`, `pnpm typecheck`, `pnpm build-storybook` → xanh.
- ✅ 6 ảnh visual (3 viewport × 2 nhánh) trong plan dir.
- ✅ Security recheck: view 3 cột · grant `authenticated`, không `anon` · anon key từ chối.
- ✅ `.playwright-mcp/`, `test-results/`, `playwright-report/` → `.gitignore`.
- ✅ `evidence/green-evidence.md` ghi: CI chỉ **1** test (C17).
- ✅ Spec diff rỗng hoặc có lý do; C12/C16 vacuous test fixes recorded.

## Risk Assessment

| Rủi ro | Khả năng | Tác động | Countermeasure |
|---|---|---|---|
| Migration `0005` chưa áp dụng → nhánh other 404, trông y hệt bug UI | **Cao** | Cao — sửa nhầm chỗ, mất giờ | Bước 2 verify bằng query trước khi kết luận |
| Supabase chưa lên → toàn `@auth` đỏ ở `/login` | **Cao** | Cao | Preflight + bảng chẩn 3 kiểu đỏ |
| Dev server cũ ở `:3000` phục vụ build cũ | **Cao** | Cao — "flaky" giả | Giết `:3000` là bước bắt buộc |
| Nới lỏng assertion để làm xanh | Trung bình | **Rất cao** — mất luôn giá trị của e2e-red-first | Out of scope + Success Criteria đòi diff spec rỗng |
| Đổi `redCommand` (thêm `--grep`) rồi báo GREEN | Trung bình | **Rất cao** — bằng chứng giả | Bước 3 chạy nguyên văn từ `red-evidence.md` |
| Phase 02 làm vỡ `/`, `/awards`, `/standards`, `/login` mà không ai chạy | Trung bình | **Cao** — hồi quy lọt lên main | Regression 4 spec là điều kiện đóng phase |
| `.playwright-mcp/` lọt vào cây → format gate đỏ | **Cao** | Thấp | Bước 7 xoá trước khi chạy `format:check` |
| Chụp ảnh trước khi cuộn → hero rỗng, tưởng bug | **Cao** | Thấp–Trung bình | Cuộn hết trang trước mỗi capture |
| View bị đổi thành `security_invoker = true` giữa chừng | Thấp | Cao — `?id=` chết câm | Security recheck ở bước 8 |
| Tự sửa `src/` cho nhanh | Trung bình | Trung bình — mất ranh giới ownership, Track A/B mất dấu | Out of scope: bounded fix về đúng owner |

## Security Considerations

- **Recheck ranh giới là một phần của Definition of Done**, không phải việc làm thêm: view 3 cột, `anon` không có quyền, anon key bị từ chối. Ba lệnh, chặn nếu lệch.
- C16 (response không chứa `email`/`role`) phải **thật sự chạy và xanh** — nó là bằng chứng SEC_004 duy nhất chạy được tự động.
- C9 (other không có option Sent trong DOM) là bằng chứng SEC_001 — xác nhận nó xanh vì bề mặt bị **xoá**, không vì bị `hidden`.
- Không commit credential test, không commit `.env`, không đưa `access_token` vào evidence.
- Ghi rõ giới hạn CI vào evidence: dấu tick xanh trên PR **không** chứng minh `/profile` hoạt động.

## Next Steps

Hoàn tất F006. Việc còn lại thuộc phiên sau, ghi vào `plans/action-items.md`: merge delta F006 vào `docs/vi/system/permissions.md` thật (đúng quy trình F004/F005 — chỉ merge sau khi có code) · quyết định sản phẩm cho department/Hero tier/hoa-thị stars (RISK-02) · mở lại 10 TC hoãn khi Kudos domain (F007+) ra đời · gỡ `disabled` cho "Mở Secret Box"/"Viết Kudo" (DEBT-01).
