# Phase 04 — Đối chiếu spec + bump version

## Context Links

- [`plan.md`](./plan.md) § Decisions · [`clarifications.md`](./clarifications.md) § Hành vi
- Spec draft: [`spec/F003_Homepage/`](./spec/F003_Homepage/) (`status: draft`)
- Đích promote: `docs/vi/features/F003_Homepage/`, `docs/vi/screens/SCR003_Home/`
- `~/.claude/rules/documentation-management.md`

## Overview

- **Priority:** P2 · **Status:** partial · **Effort:** 30m · **Depends on:** phase 03
- Sửa 4 chỗ spec draft ghi sai so với hành vi đã được test chứng minh, bump version, rồi promote
  spec `draft → implemented`. Chủ sở hữu: `doc-writer`.
- **Spec correction (DONE early by orchestrator):** 5 places in `spec/F003_Homepage/` corrected
  so E22 is OPEN STATE of E19, not a second button; `cancelLabel` is `title` only, not `aria-label`.
  Changes applied directly to the draft in `plans/260908-1103-home-widget-fab/spec/F003_Homepage/`.
- **Pending:** version bump (0.8.1 → 0.8.2) and spec promotion to `docs/` await owner action.

## Key Insights

- **Spec draft mâu thuẫn với clarifications và với test.** Spec draft dựng nút × thành **button
  thứ hai** mang `aria-label="Hủy"`:
  - `spec/.../SCR003_Home/spec.md:100` — E22 là một hàng `button` riêng
  - `spec/.../SCR003_Home/spec.md:188` — *"nút đóng panel widget (E22) dùng `aria-label="Hủy"`"*
  - `spec/F003_Homepage/technical-spec.md:159` — *"`home.widget.cancelLabel` … dùng làm `aria-label`
    của nút ×"*
  - `spec/F003_Homepage/functional-spec.md:125` — *"widget hành động nhanh có thêm một nút đóng"*
- Sai ở chỗ: `tests/e2e/home.spec.ts:303-338` [TC ID-35] click
  `button[aria-label="Hành động nhanh"]` **lần thứ hai lúc panel đang mở** để đóng, và TC ID-54 / TC eaecd588
  của `home-widget-fab.spec.ts` đọc `aria-expanded` trên đúng label đó. Đổi label sang "Hủy" (hoặc
  thêm button thứ hai) làm cả 3 test đỏ. Spec draft cũng tự mâu thuẫn: `spec.md:157` viết
  *"Trigger (E19) tự nó luôn hiện — chỉ đổi hình dạng pill↔×"*, tức chính là morph một button.
- **Sửa spec, không sửa code.** Clarifications là authoritative, test là hợp đồng nghiệm thu, và
  cả hai nhất quán với nhau. Spec draft là bên phải sửa.
- Promote spec **sau khi** sửa — nếu promote trước, tài liệu sai lan vào `docs/`.

## Requirements

Functional:
- E19 và E22 trong screen spec nói rõ là **cùng một DOM node**: E19 = mặt trigger, E22 = mặt đóng
  của cùng button đó, không phải element thứ hai.
- `home.widget.cancelLabel` được mô tả đúng vai: `title`/tooltip của trigger lúc mở,
  **không** phải accessible name. Accessible name cố định là `home.widget.label`.
- BR-007 diễn đạt lại: "nút × là trạng thái mở của trigger, gọi `close()` trực tiếp, đứng ngoài
  `[role="menu"]`, giữ `aria-label` cố định".
- `package.json` `0.8.1 → 0.8.2` (patch).
- Spec promote sang `docs/vi/features/F003_Homepage/` + `docs/vi/screens/SCR003_Home/`, frontmatter
  `status: draft → implemented`.

Non-functional:
- Không đổi số FR/BR/E-id đã cấp (`FR-210`, `FR-401`, `BR-006`, `BR-007`, `E19`-`E22`) — chỉ đổi
  câu mô tả. Traceability giữ nguyên.
- Không cấp fcode mới. F003 vẫn là F003.

## Architecture

```
plans/…/spec/F003_Homepage/          ── sửa 4 chỗ ──▶  status: implemented
   ├── functional-spec.md:125,151-154                 │
   ├── technical-spec.md:155,159,280                  │
   └── screens/SCR003_Home/spec.md:100,157,188        │
                                                      ▼
                        docs/vi/features/F003_Homepage/{functional,technical}-spec.md
                        docs/vi/screens/SCR003_Home/spec.md
package.json: version 0.8.1 → 0.8.2
```

## Related Code Files

Sửa:
- `plans/260908-1103-home-widget-fab/spec/F003_Homepage/functional-spec.md`
- `plans/260908-1103-home-widget-fab/spec/F003_Homepage/technical-spec.md`
- `plans/260908-1103-home-widget-fab/spec/F003_Homepage/screens/SCR003_Home/spec.md`
- `package.json` (chỉ field `version`)
- `docs/vi/features/F003_Homepage/functional-spec.md`, `technical-spec.md`
- `docs/vi/screens/SCR003_Home/spec.md`

Đọc: `plans/reports/tester-260908-<hhmm>-fab-green-evidence.md` (phase 03),
`docs/vi/features/F003_Homepage/README.md`.

**File ownership:** 3 file spec draft + `package.json` + 3 file đích trong `docs/`.
**Không chạm:** `src/**`, `tests/**`, `messages/**`.

## Implementation Steps

**Spec correction (COMPLETED by orchestrator, 2026-09-08 ~12:00):**
1. ✓ Sửa `screens/SCR003_Home/spec.md`: hàng E22 ghi rõ *"cùng DOM node với E19, mặt đóng của
   trigger"*; dòng 188 sửa thành *"trigger widget giữ `aria-label="Hành động nhanh"` cố định ở cả
   hai trạng thái; `home.widget.cancelLabel` chỉ dùng cho `title`/tooltip, không phải accessible
   name"*.
2. ✓ Sửa `technical-spec.md`: dòng 159 (vai của `cancelLabel`) và mô tả BR-007 ở dòng ~280.
3. ✓ Sửa `functional-spec.md`: dòng 125 và 151-154 — bỏ cách nói "thêm một nút đóng", thay bằng
   "trigger morph, một button duy nhất".
4. ✓ Bổ sung một dòng vào cả 3 file: FAB chỉ có ở homepage; `<WidgetButton>` render ngoài div gốc
   của `home-screen.tsx` (overlay `fixed`, không thuộc stacking context `isolate` của trang).

**Version bump and promotion (PENDING owner action):**
5. [ ] `package.json` version → `0.8.2`.
6. [ ] Promote 3 file spec sang `docs/`, đổi frontmatter `status: implemented`, `created` giữ ngày gốc
   của bản live, thêm mốc revision 2026-09-08.
7. [ ] Đánh giá `docs/vi/generated/*` (nếu có): không có mã/route mới → khả năng không cần row edit;
   nói rõ `Docs impact: minor`.
8. [ ] Append vào `plans/action-items.md` mục `## Decisions` + `## Nợ lại` (2 câu hỏi mở dưới đây).

## Todo List

**Completed (orchestrator, 2026-09-08):**
- [x] `SCR003_Home/spec.md` E22 + dòng 188
- [x] `technical-spec.md` dòng 159 + BR-007
- [x] `functional-spec.md` dòng 125 + 151-154
- [x] Ghi chú "FAB render ngoài div gốc" vào cả 3 file

**Pending (owner: doc-writer or release lead):**
- [ ] `package.json` → 0.8.2
- [ ] Promote 3 file spec sang `docs/`, `status: implemented`
- [ ] `Docs impact:` nêu rõ trong commit/PR
- [ ] `plans/action-items.md` cập nhật

## Success Criteria

- `grep -rn 'aria-label="Hủy"' plans/260908-1103-home-widget-fab/spec docs` → **rỗng**.
- `grep -rn "cancelLabel" docs/vi` → chỉ còn cách diễn đạt `title`/tooltip.
- `node -p "require('./package.json').version"` → `0.8.2`.
- Frontmatter 3 file trong `docs/` là `status: implemented`.
- Không có FR/BR/E-id nào bị đổi số (diff chỉ ở câu mô tả).
- `pnpm format:check` xanh (markdown cũng đi qua prettier).

## Risk Assessment

| Rủi ro | Khả năng | Ảnh hưởng | Đối phó |
|---|---|---|---|
| Promote spec trước khi sửa → tài liệu sai vào `docs/` | Trung bình | **Cao** | Thứ tự bước 1-3 trước bước 6, đây là lý do phase 04 tồn tại |
| Sửa spec bằng cách đổi số E-id → vỡ traceability | Thấp | Trung bình | Chỉ sửa câu mô tả, giữ nguyên id |
| Bump minor thay vì patch | Thấp | Thấp | Quyết định đã chốt ở `plan.md` § Decisions |
| Ai đó đọc spec cũ rồi sửa code cho khớp spec | Trung bình | **Cao** | Ghi thẳng vào spec rằng clarifications + e2e là nguồn đúng |

## Rollback

Chỉ tài liệu + 1 field version. `git checkout -- docs package.json plans/…/spec` là đủ. Không có
tác động runtime.

## Security Considerations

Không. Không secret trong spec; không đổi cấu hình, không đổi quyền.

## Next Steps / Câu hỏi còn mở / Pending Work

**Immediate (Phase 04 continuation — owner: doc-writer or release lead):**
- [ ] Bump `package.json` version 0.8.1 → 0.8.2 (patch revision).
- [ ] Promote 3 spec files from `plans/260908-1103-home-widget-fab/spec/F003_Homepage/` to
  `docs/vi/features/F003_Homepage/` and `docs/vi/screens/SCR003_Home/`, changing frontmatter
  `status: draft → implemented`.
- [ ] Document `Docs impact: minor` (no code/route changes, spec corrections only).

**Product/Process decisions (for human):**
- Test case MoMorph của cả 2 frame FAB đều **rỗng** (`get_frame_test_cases → []`). E2E được viết
  từ spec + design. **Có ghi ngược 5 test case (ID-54, eaecd588, c4b65775, 3b6565d3, e0451b6d) lên MoMorph không?** — cần người quyết.
- Frame thu gọn `_hphd32jN2` vẫn `design_status: in_progress` dù đã có node data và repo đã dựng
  theo nó từ phase homepage. **Có đánh `done` trên MoMorph không?** — cần người quyết.

**After phase 04 completes:**
- `/tkm:ship` theo `takumi-flow` (PR về `main`, `gh` phải ghim
  `--repo thangdx-1076/agentic-coding-hands-on`).
