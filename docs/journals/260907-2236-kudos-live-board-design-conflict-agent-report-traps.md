---
title: "Kudos Live Board multi-phase coordination — design conflict triage, agent report hallucination, orchestrator grep-blind fixes"
date: 2026-09-07
time: "09:00 → 22:36"
tags: [momorph, feature-F007-F008, multi-phase, agent-coordination, design-conflict, report-accuracy, data-validation]
severity: high
---

# Tóm tắt

Screen MoMorph "Sun* Kudos - Live board" (screenId MaZUn5xHXZ, 64 design item, 41 test case) từ Figma → production route `/kudos` công khai. Hai feature: `F007_KudosLiveBoard` + `F008_KudosHeartReaction`, screen `SCR007`. Từ spec: là **màn hình đầu tiên của repo có đường ghi vào database** — 6 feature trước đều read-only. Quy mô: 14 phase + 4 lượt sửa ngoài plan, 20 agent, 283 unit test (coverage 100%), e2e **131 pass / 4 skip / 0 fail / exit 0**. Inspect (reviewer): SEALED · score 8/10 · 0 critical. Migration: `0006` (bảng+view), `0007` (tim+trigger), `0008` (seed). PR: 168 file.

Ba vấn đề cốt lõi được phát hiện:
1. Ba mâu thuẫn nằm trong CHÍNH dữ liệu design Figma — không cái nào là lỗi code
2. Bốn "DONE" từ agent nhưng toàn khẳng định sai — chỉ lộ ra khi chạy lại
3. Hai lỗi của orchestrator khi sửa tài liệu theo token thay vì nội dung

---

## Mâu thuẫn 1: Tim cộng cho ai — design text xung đột

**Hiện tượng**: `C.4.1` chứa hai câu:
- Câu 1 (công nhân): "tài khoản **gửi** lời cảm ơn... được cộng 1 tim"
- Câu 2 (rút gọn): "số tim trên tài khoản **nhận** kudos sẽ bị thu hồi"

Rút gọn nói "nhân", công nhân nói "gửi". Chúng không thể cùng đúng.

**Phân xử**: Dùng **test case** (TC thắng trên design text xung đột). Test case ghi: *"the sender's account receives +2 hearts"*. 

**Chọn**: Tim cộng cho người **GỬI**. Vẫn cần product xác nhận cuối.

---

## Mâu thuẫn 2: Trạng thái tim xám không tồn tại trong design

**Hiện tượng**: Text mô tả nói "màu xám với trạng thái inactive", nhưng `query_component("Heart")` cho thấy **cả 7 instance trong frame dùng chung một componentId `256:5162`**, fill màu `#D4271D` (đỏ). Không có trạng thái xám được vẽ.

**Phân xử**: Design chưa bao giờ vẽ xám. Dùng token `#999999` làm placeholder và ghi rõ là placeholder để UI có fallback.

---

## Mâu thuẫn 3: Nhãn nút prev/next bị tráo

**Hiện tượng**: 
- `B.2.1` có `nameTrans` = "Nút Tiến (Next)" nhưng `itemName` = `Button lùi`, description: "chuyển sang card trước đó, page 1 thì disable"
- `B.2.2` ngược lại

Văn bản tráo nhau.

**Phân xử**: Dùng **hành vi thực + toạ độ X** thay vì nhãn text. Nút bên phải = Next (X cao), nút bên trái = Prev (X thấp). Text bỏ qua.

---

## Bốn báo cáo sai từ agent — chỉ lộ ra khi chạy lại

Tất cả đều "DONE", tất cả đều chỉ phát hiện được bằng một lệnh khác hay `cmp`/`md5`.

### Sai 1: "Assets đã xong" — nhưng icon vẽ tay, kích thước sai

Agent khẳng định assets resolved. Thực tế:
- 5 icon được **vẽ tay** (agent không có MCP MoMorph, vẽ hardcoded)
- Logo thật: **593×106**, report nó: "364×74"
- Mũi tên carousel: **60px** (thực), "24px" (report)
- Slide-nav: **28px** (thực), "24px" (report)
- `icon-chevron-right`: placeholder lật gương, chứ Figma có hai path trái/phải khác hẳn

**Lệnh bắt**: `list_media_nodes; identify -verbose *.svg`

### Sai 2: "C15 = app bug, dropdown Phòng ban không render"

Agent báo: UI đơ. Thực tế: `SELECT u.department ... GROUP BY` cho `(null) → 12` (NULL value, 12 record không department).

Nguyên gốc: Agent đó thay đổi domain email, tác dụng phụ là delete/recreate `auth.users`. Trigger `handle_new_user` (migration 0002) không biết cột `department` (thêm ở 0008), và 0008 đã nằm trong `schema_migrations` nên `migration up` bỏ qua Step 2.

Chạy lại Step 2 → C15 PASS. UI chưa bao giờ hỏng.

**Lệnh bắt**: `psql -c "select count(*), department from public.users group by department;"`

### Sai 3: "Chụp 2 trạng thái ẩn danh / đã đăng nhập"

Report: 2 screenshot chứng cứ. Thực tế: **trùng byte** (`md5 ecfab1a9…`). Một ảnh lưu hai lần.

**Lệnh bắt**: `md5 screenshot-*.png; cmp file1.png file2.png`

### Sai 4: "Design fidelity: High, no material mismatch"

Agent báo: Khớp perfect. Inspect render vs `frame-image.png`:
- Spotlight chỉ đổ 8 tên vào 8 slot đầu, **hộp trống ~80%**
- Thiếu cả ticker
- Design lặp 8 tên qua ~106 slot để phủ kín

Sau sửa: `browser_evaluate` đếm được **106** node tên (khớp design).

**Lệnh bắt**: `cmp frame-image.png render.png; browser_evaluate("querySelectorAll('[role=marquee] *').length")`

---

## Hai lỗi của orchestrator khi sửa tài liệu

Ghi thẳng, không giấu.

### Lỗi 1: Trích dẫn test case không tồn tại

`study-context.json` viện: "awards.spec TC ID-12 và ID-14". 

`awards.spec.ts` kiểm tra: **0 lần** xuất hiện hai ID đó. Chúng ở `home.spec.ts` và file test khác.

Nguyên nhân: Copy từ báo cáo researcher mà không cross-check. Reviewer bắt được lúc review.

**Bàn**: Grep trích dẫn trước khi ghi action-items.

### Lỗi 2: Sửa tài liệu theo token, không nội dung

Grep `"APP BUG"` rồi sửa 4 chỗ khớp, bỏ sót **6 chỗ** nói y hệt bằng từ ngữ khác:
- "Awaits implementation fix"
- "✘ FAIL (dept)"
- "12/15 criteria"

Bản sửa nửa vời tạo **mâu thuẫn mới ngay trong cùng bảng** (column này nói fixed, column khác nói still broken).

Reviewer từ chối xác nhận đến khi đủ. Re-reviewer tìm ra 6 chỗ bỏ sót.

**Bàn**: Grep semantic + manual audit, không regex blind.

---

## Chi tiết kỹ thuật đáng giữ

- **RLS mang quy tắc, không để UI giữ**: `kudo_hearts_insert_own` `WITH CHECK = user_id = auth.uid() AND user_id <> (SELECT sender_id FROM kudos WHERE id = kudo_id)`. Authenticated role chỉ `SELECT`, `heart_count` thay bằng trigger `SECURITY DEFINER`. `UNIQUE (kudo_id, user_id)` đóng race double-heart. Verify: `SET ROLE authenticated` + fake `auth.uid()`.
- **`public.users.id` = FK → `auth.users(id)`**: Không seed `public.users` trực tiếp. Insert `auth.users` trước, trigger mirror. Nếu không: ngoại khóa fail.
- **View ở migration N không dùng bảng N+1**: `heart_count` không phải `COUNT()` view, phải cột denormalized do trigger duy trì.
- **`pnpm test:e2e -- <file>` không lọc**: Chạy đủ 135 test. Dùng `npx playwright test <file>`. RED ban đầu sai lệnh.
- **Assert ảnh tải: `naturalWidth > 0`, không `complete`**: Lazy-load ảnh `loading="lazy"` ngoài viewport có `complete: false` nhưng đã decode. Tôi suýt báo lỗi giả.
- **Chạy song song trên một file là rủi ro**: Refactor land giữa chừng, agent kia thua lượt. Cảnh báo lời không đủ, tách thời điểm.

---

## Bài học tổng

Không lỗi nào trên được test bắt. Toàn bộ phát hiện bằng đối chiếu thủ công với nguồn sự thật: `md5`, `cmp`, `psql`, inspect visual, re-read CSV. Chi phí kiểm mỗi cái: vài giây đến vài phút. Chi phí bỏ qua: màn hình hỏng rõ bằng mắt, hoặc "nợ" giả ghi vào PR.

**Chính yếu**: Báo cáo agent không tự sinh lỗi — agent chỉ báo điều nó tin. Khi báo cáo có "DONE" gắn kèm artifact (file ảnh, log, metric), phải cross-check artifact chứ không tin metadata. Hệ thống verification nhiều lớp không phải "nhiều mắt → chắc chắn hơn" — mỗi lớp mù ở chỗ khác. Orchestrator phải chủ động làm lại thử, không chỉ đọc report lần một.

---

## Công nợ và tiếp theo

1. **Product chốt tim cộng cho ai** — hiện hoãn pending decision (ghi nợ)
2. **Màu xám tim** — giữ placeholder `#999999`, refresh khi design xác nhận
3. **Kiểm verify asset kích thước** — tôi không chạy `list_media_nodes` lại lần hai
4. **Tester viết E2E strict chứ không chỉ spec** — chứng chỉ hành vi, không chỉ style
5. **Orchestrator: grep semantic trước khi sửa tài liệu hàng loạt** — pattern matching không đủ

---

**Evidence**: 
- `/plans/260907-1725-kudos-live-board/` (spec, clarifications, 14 phase)
- Migration: `0006-create-kudos-tables.sql`, `0007-add-kudo-hearts-trigger.sql`, `0008-seed-kudos.sql`
- Test: 283 unit (coverage 100%); e2e **131 pass / 4 skip / 0 fail**, exit 0 (4 skip = 3 có sẵn + C26 `test.fixme`)
- Inspect: SEALED · score 8/10 · 0 critical · evidence gate exit 0
- Commit: 168 file, PR chưa merge
- Cross-check: md5, cmp, psql, browser_evaluate

**Status:** RESOLVED
**Summary:** `/kudos` screen built end-to-end (MoMorph → migration → e2e). e2e 131 pass / 4 skip / 0 fail (exit 0), 283 unit ở coverage 100%, reviewer SEALED score 8/10. Core issue: three design conflicts (timed receiver, missing gray state, flipped prev/next label) need product decision; four agent reports were false (misidentified assets, false app-bug, duplicate screenshot, fake fidelity); two orchestrator errors (stale TC citation, grep-blind text fix). All caught pre-merge by manual validation. No code defect; all issues are data/report accuracy.
**Concerns:** Product decision on heart-recipient still open. Placeholder gray color `#999999` pending design confirm. Workflow: agent multi-parallel on same file = unsafe; verify phase must stagger or lock.
