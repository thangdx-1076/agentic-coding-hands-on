---
title: "Secret Box Modal (F010) — Four agent reports misattributed test failures; exit code ≠ cause; bare flex hides dialogs"
date: 2026-09-08
time: "13:37 → 16:15"
tags: [feature-F010, e2e-red-first, agent-reports, false-attribution, postgres-rpc, dialog-css, fixture-direction]
severity: high
---

# Tóm tắt

Feature F010_SecretBoxModal: `/kudos` modal với 6 huy hiệu, rút 1 ngẫu nhiên từ `SECURITY DEFINER` RPC. Entitlement = `floor(sum(kudos.heart_count WHERE sender_id = me)/5) − count(openings)`. Migration `0011` lưu log (`secret_box_openings`), không counter. Spec 4 row, 19 test case thật, e2e-red-first policy. **Shipped: 14/14 xanh, 188 suite đỏ → xanh, unit 591/591 @ 100%, typecheck/lint/build clean, reviewer SEALED 9/10 medium.**

Spine: **bốn lần tester agent báo RED lý do sai, lần đầu là SAI FIXTURE (viewer nhận tim thay vì gửi), mỗi lần sau là SAI ASSERTION hoặc SAI NGÔN NGỮ.**

Kỳ lạ nhất: fixture sai chiều chìm sâu vào test (entitlement = 0 mà hardcoded cũng = 0) nên lỗi "xanh" theo công thức sai, không bao giờ phát hiện chừng khi so với spec tỉ mỉ.

---

## Bài học lõi: exit code không phải cause, và cái chứng minh sai không bao giờ sửa được cái sai đó

Bốn lần session này, một agent (hoặc cộng sinh orchestrator track) ghi lại: "RED từ lý do X" hoặc "GREEN chứng minh Y" — nhưng:

1. **Lý do X sai, test không bao giờ chạy** (test.skip cứng)
2. **Lý do X sai, test chạy nhưng fix sai đỏ** (fixture đơn vị lỗi + hardcoded cùng sai = yên)
3. **Lý do X sai, test khác tương thích pattern cũ** (Playwright `click()` tự-wait-enabled bị nhầm với nút đã chạm)
4. **GREEN quên ghi tại sao GREEN, chỉ ghi trạng thái** (đúng cơ học, ghi sai ngôn ngữ)

---

## Chi tiết bốn lần — từ tinh khiết nhất tới độc hại nhất

### Lần 1: Unconditional `test.skip()` trong RED vô tác dụng (260908-1337, tester agent)

**Triệu chứng**: Tester report `tester-260908-1337-red-evidence.md` dòng 62-66:
```
Tests S02–S12 are marked with test.skip()
Expected: 14 total | 1 failed (RED), 11 skipped
```

**Vấn đề**: Khi test code chứa `test.skip("...", () => {...})` (unconditional), Playwright skip nó. Lần này không chạy. RED là "modal không tồn tại" (S01) → xanh. Nhưng S02–S12 là "modal đã mở, xem title/badge/counter" — chúng được `test.skip()` cứng, nên lần sau implementer xóa skip, lần chạy đầu tiên là lần đầu thực thi, không phải "green thực từ RED".

**Thực tế sâu**: Một tester RED nên chứa 1–3 core assertion (PRIMARY RED) + backup checks (S13, S15). Cái này có 1 PRIMARY (S01, modal gọi là S02 trong lúc thực thi?) + 11 deferred. Unconditional skip thường là flag: "tôi chưa viết bản này", không phải "tôi chưa implement".

**Hậu quả**: Orchestrator nói "RED valid" vì exit 1 đúng. Implementer tính toán xong phase 1–5, chạy lại → "11 tests vô hình biến xanh nhanh quá, không phải chứng minh cái gì, phải không?". Không, nó chứng minh component được mount.

**Fix**: Phase quán lý RED bắt buộc: loại bỏ unconditional skip — viết assertion cứng, hoặc ghi rõ ở top: "tests 2–12 chưa implement, sẽ viết ở phase B".

### Lần 2: Fixture seed sai chiều + hardcoded counter trùng sai (260908-1403, tester verification, phát hiện lần 2 RED)

**Triệu chứng**: Orchestrator trace `tester-260908-1403-red-evidence.md` vs. `tester-260908-1414` (hai RED evidence report cách nhau 11 phút):

Lần 260908-1403:
```
[S01] Entitled user (unopened=1): expected enabled | received disabled
Setup: Seeded 5 hearts from sender→viewer (unopened should be 1)
```

Lần 260908-1414 (SAU khi planner phát hiện):
```
Setup: Seeded 5 hearts FROM viewer→counterpart (opener/sender mới đúng)
```

Khác nhau: lần 1 `sender_id=X, receiver_id=viewer`; lần 2 `sender_id=viewer, receiver_id=X`.

**Gốc rễ**: BR-002 nói "entitlement = hearts GỬI bởi bạn" (`src/dal/kudos-stats.ts:86-96` tính `WHERE sender_id = user`). Test đầu seed sai chiều → viewer không phải sender → entitlement = 0. Đúng rồi S01 fail. Nhưng **nếu cẩn thận nhìn thấy hardcoded `unopened: 0`** (`page.tsx:146-147`), lỗi là "cả hai cùng = 0" chứ không phải "seed sai", nên lập trình viên fix sai jnơi (sửa fixture thay vì sửa code).

**Cơ học**: Test fail → "sai fixture". Nhưng tester agent không kiểm BR-002 (BR-002 là "business rule" không phải test fixture). Tester nên so khớp: "entitlement 0 từ seed?" vs. "hardcoded unopened 0?" → nếu cả hai cùng 0 thì fix phía nào? Cả hai. Lần này tester bỏ qua bước xác nhận.

**Ấn tượng của planner**: Phát hiện bằng cách đọc BR code, ghi `clarifications.md`§1 (sender chiều "INFERRED" = reader must map spec + BR chính xác). Tester agent không đọc BR, chỉ đọc test output.

**Fix**: Phase 01 (`tester-260908-1420-fixture-fix.md`) sửa seed, quyết không sửa assertion. Verify trực tiếp DB: Supabase REST API call → kiểm `sender_id = viewer`. Code không thay đổi, fixture đổi.

### Lần 3: S13 "assert disabled" bằng click — Playwright auto-wait enabled bị hiểu nhầm (260908-1414, tester RED, rồi 260908-1531 tester temper)

**Triệu chứng**: `tester-260908-1414-red-evidence.md` dòng 53 (trong mục "lỗi S02-S12"):
```
S02–S06: Also need modal component to exist
S13: Uses try/catch pattern (per profile.spec.ts:404-410) to attempt click on disabled button
```

Cụ thể: S13 viết `await openGiftBtn.click()` **trần** trên đúng cái nút mà nó vừa assert là
`disabled`.

**Vấn đề**: `click()` của Playwright tự chờ element "visible, enabled and stable" trước khi bấm —
đó là tính năng, không phải bug. Nút disabled thì nó retry tới hết timeout rồi throw. Log thật:
`56 × waiting for element to be visible, enabled and stable — element is not enabled`. Nên S13
**đỏ**, và đỏ vì chính cái điều nó đang muốn chứng minh. Tệ hơn: S13 mô tả hành vi **đã đúng sẵn**
hôm nay, tức nó phải XANH; để nguyên thì nó đỏ vĩnh viễn và mời người sau "sửa" bằng cách nới
assertion.

**Fix**: dùng đúng idiom repo đã có ở `tests/e2e/profile.spec.ts:404-410` — assert `toBeDisabled()`,
rồi *thử* click trong `try/catch` với timeout ngắn, rồi assert dialog vẫn không mở:

```typescript
await expect(writeKudoBtn).toBeDisabled();
// Attempt interaction (disabled button won't respond to normal click)
try {
  await writeKudoBtn.click({ timeout: 1000 });
} catch {
  // Expected: button is disabled and the click times out
}
await expect(dialogs).toHaveCount(0);
```

Assertion `toHaveCount(0)` sau cú click thất bại mới là contract thật, và nó được giữ nguyên.

**Thực tế**: S13 vẫn pass (button thực sự disabled), nhưng lý do ghi sai. Không ảnh hưởng chức năng, nhưng confusion pattern.

**Fix**: Reviewer chỉ (Low priority), không cản ship. Dòng bình luận có thể cập nhật sau.

### Lần 4: Bare `flex` utility che khuất `<dialog>` bị closed (feature-complete, pre-merge 260908-1531)

**Triệu chứng**: phase 05 wire xong nhưng `secret-box.spec.ts` chỉ 3/14 xanh (S01, S13, S15);
11 row còn lại đỏ vì click vào `[data-testid=kudos-open-gift]` không mở được modal.

**Gốc rễ**: bare `flex` nằm trên className của **chính `<dialog>`** (`secret-box-dialog.tsx:92`),
đứng cạnh `open:flex`:
`className="m-auto flex w-163 flex-col ... open:flex ..."`. Khai báo của author **thắng** UA
stylesheet `dialog:not([open]) { display: none }` theo **thứ tự origin của CSS cascade** — không
phải theo specificity (đây là chỗ dễ nhớ sai). Nên dialog lúc đóng vẫn `display: flex`: nó được
layout và paint full-page, phủ lên trang và ăn luôn cú click vào nút trigger, `showModal()` không
bao giờ được gọi.

**Hiện tượng**: Dialog closed nhưng vẫn paint trên screen (invisible), chiếm không gian, click trap.

**Fix**: Commit `c5e9790` remove bare `flex` từ dialog wrapper, giữ `flex-col` + `open:flex` pattern. Khi dialog không có `open`, ancestor chỉ render `flex-col` (lợi thế: không phá layout), nhưng `open:flex` chỉ apply khi dialog opened.

**Bài học**: Utility CSS **không phải semantic** — `flex` = "buộc display flex", `open:flex` = "display flex chỉ khi open". Chồng chất = hiện vật không mong. Cả hai dialog working (`kudos-compose-dialog.tsx:93`, `kudos-link-dialog.tsx:91`) đã dùng `flex-col` + `open:flex`, và `kudos-link-dialog.tsx:52-54` **có comment giải thích chính trap này**. Implementer ghi comment nhưng quên apply khi viết dialog thứ 3.

---

## Cũng đáng ghi lại (hai dòng mỗi cái)

**C19 sửa, không waive.** Một test `@local-db` đợi paging sentinel ("điểm dừng" scroll) biến mất nhưng local DB seed ~184 kudos → sentinel **hợp lệ** tồn tại. Bản cũ poll visibility (~vô hình), assertion pass. Bản mới poll `toHaveCount(0)` (unmount thực). Cost: 2 `eslint-disable` cho vòng lặp 50 lần, nhưng tighter assertion.

**Postg `set role anon` crash container.** Verify RLS + anonymous reject phải dùng **PostgREST + anon key** (HTTP 401), không dùng `set role anon` trong psql (toàn bộ container segfault, unrelated tới migration 0011, có sẵn).

**Promote qua Delivery, không qua takumi stage 3.** Dự tính stage 3 (Promote Gate) của takumi chạy tự động; tôi bỏ qua lúc đi Forge → chạy bù lúc Delivery: cấp F010 + `docs/vi/features/F010_SecretBoxModal/`, forward-draft `permissions.md` + `architecture.md` ở branch SYSTEM-DOC.

**CI không chứng minh feature.** 13/14 e2e row của F010 là `@auth`/`@local-db` → CI loại bỏ (`--grep-invert "@auth|@local-db"`). Chỉ S15 (anonymous guard) chạy ở CI. Green CI = false negative đối với feature này — phải verify local.

---

## Phân tích bên trong: sao agent báo sai mà không phát hiện?

Không phải agent "sai", mà là **báo cáo không đi qua kiểm chứng thứ 2**:

1. **Tester 1337**: "11 skipped" → orchestrator nhìn "exit 1, xanh" = hợp lệ. Nhưng không hỏi lại: "skip unconditional = RED hợp lệ?"
2. **Tester 1403**: "seed fail" → orchestrator đóng box. Nhưng không kiểm BR-002 để xác nhận fixture hay code mới sai.
3. **Tester 1414**: S13 assert "disabled" bằng cách `click()` trần → đỏ vì Playwright chờ enabled, không phải vì thiếu feature. Bỏ qua idiom `toBeDisabled()` + `try/catch` click đã có sẵn ở `profile.spec.ts:404-410`.
4. **Momorph UI 1420**: "gắn flex" → componenthư chuẩn layout. Nhưng không kiểm existing dialogs cùng codebase (`kudos-compose-dialog`, `kudos-link-dialog`).

**Điểm chung**: Agent đều báo chuẩn theo **lĩnh vực riêng** (tester = test runner, UI implementer = render), nhưng không cross-check với **domain rules** (BR = business rule, convention = codebase pattern).

**Ai bắt được, và bằng cách nào**: 3 trong 4 lần do orchestrator tự verify chứ không đọc tóm tắt —
đọc thẳng file spec để thấy 11 `test.skip` vô điều kiện, tự chạy suite, tự `docker exec ... psql`
kiểm grant/RLS, tự `git diff 975f4f8..HEAD` để chứng minh PR không chạm code paging (bác bỏ nhãn
"pre-existing" bằng bằng chứng thay vì tin). Lần thứ 4 — chiều seed fixture — **planner** bắt, không
phải orchestrator: nó đọc `BR-002` cạnh code `kudos-stats.ts:86-96` rồi cạnh fixture, tức đối chiếu
ba nguồn mà orchestrator lúc đó chỉ đối chiếu hai.

Bài học không phải "phải verify" (session này có verify) mà là **verify phải bắc qua domain**: đỏ ở
test chỉ chứng minh trạng thái, muốn biết *nguyên nhân* thì phải kéo business rule + code + fixture
về cùng một chỗ mà đọc.

---

## Quyết định ghi lại

- **RED phải lọc bỏ unconditional skip** — RED bao gồm tất cả core assertion chạy + design guard. Skip là deferred, không phải RED.
- **Fixture mismatch chẩn đoán theo business rule, không chỉ test output** — so khớp `BR-002 = hearts_sender` vs. `test seed = who sends?` cùng một lúc.
- **Pattern cross-check: mình viết giống codebase không?** — trước khi assert trên một nút `disabled`, đọc `profile.spec.ts:404-410` xem repo đã làm thế nào.
- **Utility CSS chồng chất = hiện vật.** Semantic state (`open` attribute) luôn override non-semantic utility (`flex`). `open:flex` là an toàn, `flex + open:{...}` là trap.

---

## Còn ngỏ (từ clarifications.md, chưa closure)

1. Tiêu đề hai state: INFERRED từ render + spec. Khách chốt mỗi cái 1 hằng số.
2. Nút `/profile` vẫn `disabled` — quyết có bật không?
3. Huy hiệu nhận được phản chiếu `/profile` BadgeCollection chưa (0011 data đủ).

---

## Kết thúc

F010 landed, 14/14 xanh local (188 suite đỏ→xanh, unit 591, 100%, typecheck/build/lint clean). Reviewer SEALED (h1 độc lập: unrecognized error swallows vào `{ok:false,reason:"unknown"}` không log, known trade-off). Hộp đã mở, huy hiệu xanh trên bàn.

Bài học lớn: **exit code không phải nguyên nhân.** Một test fail không bao giờ kể ra tại sao; nó chỉ nói "tôi không xanh". Attribution là công việc của người đọc, không phải của test framework. Bốn lần tester/UI agent báo attribution, bốn lần attribution sai hoặc không đủ. Orchestrator phải verify trước khi chấp nhận. Verify = "đối chiếu BR, xem codebase pattern, chạy psql/trace/typecheck", không chỉ "đọc tóm tắt agent".

---

**Evidence**:
- Commits: 70cf07b..1d43a4e (6 commit chính)
- RED → GREEN: tester-260908-1414-red-evidence.md → tester-260908-1531-temper.md
- Fixture: tester-260908-1420-fixture-fix.md (Phase 01)
- Dialog: commit c5e9790 (bare `flex` fix)
- Reviewer: reviewer-260908-1531-inspection.md (9/10 medium, ship)
- Plan: plans/260908-1337-secret-box-modal/plan.md (6 phase, completed)
- Promote: docs/vi/features/F010_SecretBoxModal/ (final)

**Status:** DONE
**Summary:** F010 shipped (14/14 e2e, 591/591 unit 100%, typecheck/build/lint green). Four agent reports misattributed test failures (skipped assertions, fixture direction, assertion pattern, CSS utility): fix path = cross-check BR + codebase pattern + verify via psql/trace, not just trust agent synopsis. Bare `flex` hides closed `<dialog>` (utility CSS specificity trap); remove unconditional `test.skip()` from RED; C19 pre-existing paging test tightened not waived.
**Concerns:** Unrecognized RPC errors swallow into `{ok:false, reason:"unknown"}` without logging (Medium); 3/4 misattributions caught by orchestrator self-verification (re-ran suites, psql, git diff vs origin/main); the 4th (fixture direction) caught by planner via BR-vs-code-vs-fixture cross-read.

