---
phase: 01
feature: F009
track: test gate
status: completed
priority: P1
test_policy: e2e-red-first
effort: 1.5h
owner: tester
file_ownership: ["tests/e2e/kudos-compose.spec.ts"]
---

# Phase 01 — RED: `tests/e2e/kudos-compose.spec.ts` là hợp đồng DOM

## MoMorph refs

- Viết Kudo: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/ihQ26W78P2 (frame `520:11602`, modal `520:11647`)
- Dropdown list hashtag: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/p9zO-c4a4x (`1002:13013`)
- Clarifications: `plans/260907-2338-kudos-write-modal/clarifications.md`
- testPolicy: `e2e-red-first`

## Context Links

- `momorph/test-cases-ihQ26W78P2.csv` — 57 TC (ID-0..ID-56). Parse bằng python `csv`, **không** `cut`/`awk` (ô có xuống dòng).
- `momorph/specs-ihQ26W78P2.csv` — 26 item (A, B, B.1-2, C, C.1-6, D, D.1, E, E.1-2, F, F.1-5, G, H, H.1-2)
- `spec/kudos-compose/functional-spec.md` § 4/5/9 · `screens/SCR-kudos-compose/spec.md` § 3/6
- `tests/e2e/kudos.spec.ts:27-52` — khuôn bảng `C##` trong header comment · `tests/e2e/helpers/sign-in.ts` — `createTestSession` + `injectSupabaseSession`
- `.github/workflows/ci.yml:205,212` — `--grep-invert "@auth|@local-db"` ở **2 chỗ**, đã đúng sẵn, **không sửa**

## Overview

**Priority**: P1 · **Test gate** (`tester`) · **Goal**: dựng trọn hợp đồng DOM của dialog "Viết Kudo" thành một spec Playwright chạy **đỏ thật** vì dialog chưa tồn tại, trước dòng code đầu tiên.

## Key Insights

- **File spec MỚI, không nối vào `kudos.spec.ts`.** File kia là hợp đồng của F007 và phase 15 phải chứng minh nó không hồi quy — trộn hai hợp đồng vào một file là mất khả năng đó, và mở ra tranh chấp ownership.
- **RED hợp lệ = assertion thất bại thật.** Pill hiện là `<input readOnly>` không handler (`kudos-compose-pill.tsx:12-14`) → click không mở gì, `expect(dialog).toBeVisible()` là thứ đỏ. Exit code khác 0 vì browser chưa cài, dev-server chết, hay Supabase down **không tính là RED**.
- **CI-safe chỉ có 2 test, và đó là con số đúng.** Mọi thứ còn lại cần một phiên đăng nhập để mở được dialog. Đừng cố nhồi thêm cho CI đẹp.
- **Đừng dùng `toBeDisabled()` cho nút `Gửi`** — AD-1 chốt `aria-disabled="true"` (native `disabled` thì ID-56 không thể click để lộ lỗi). Assert thẳng thuộc tính.
- **`Danh hiệu` không có TC nào trong 57 case** nhưng có node `*` thật trong design (clarifications § Hai node). C06/C20 cố tình đi xa hơn CSV — đừng "sửa lại cho khớp CSV".
- **Chuỗi chép từng ký tự qua python, không gõ tay**: `Gửi lời cám ơn và ghi nhận đến đồng đội` · `Dành tặng một danh hiệu cho đồng đội` · `Ví dụ: Người truyền động lực cho tôi.` · `Danh hiệu sẽ hiển thị làm tiêu đề Kudos của bạn.` · `Hãy gửi gắm lời cám ơn và ghi nhận đến đồng đội tại đây nhé!` · `Bạn có thể “@ + tên” để nhắc tới đồng nghiệp khác` (**dấu ngoặc cong** `“ ”`) · `Gửi lời cám ơn và ghi nhận ẩn danh` · `Tối đa 5` · `Hủy` · `Gửi` · `Tiêu chuẩn cộng đồng`. Thông báo lỗi assert bằng `toContainText` (substring) vì spec § 9 có dấu chấm cuối còn FR-403 thì không.

## Requirements — bảng hợp đồng (mỗi dòng một `test()`)

| # | Tag | Assertion | TC | Spec/FR |
|---|-----|-----------|----|---------|
| C01 | *(CI-safe)* | Khách chưa đăng nhập click pill → URL `/login`, dialog **không** mở | ID-1 | FR-102, BR-006 |
| C02 | *(CI-safe)* | Khách: `[data-testid=kudos-compose-dialog]` không có thuộc tính `open`; `/kudos` vẫn 200 | ID-1 | FR-102 |
| C03 | `@auth` | Đã đăng nhập click pill → dialog có `open`, tiêu đề đúng nguyên văn | ID-0, ID-2 | A, FR-101 |
| C04 | `@auth` | Thứ tự DOM trong dialog: Người nhận → Danh hiệu → toolbar+Nội dung → Hashtag → Image → checkbox ẩn danh; footer `Hủy` rồi `Gửi` | ID-3 | B/C/D/E/F/G/H, FR-201 |
| C05 | `@auth` | State ban đầu: 2 ô rỗng đúng placeholder, checkbox unchecked, ô tên ẩn danh **không có trong DOM**, `Gửi` `aria-disabled="true"` | ID-4, ID-5, ID-6, ID-48 | FR-201, FR-208 |
| C06 | `@auth` | Ô `Danh hiệu` tồn tại, có dấu `*`, đúng placeholder, **2 dòng hint** đúng nguyên văn | *(không TC — node `I520:11647;1688:10448`)* | FR-203 |
| C07 | `@auth` | `Escape` đóng dialog; mở lại → mọi trường rỗng (không lưu nháp) | ID-45 | SM-001 |
| C08 | `@auth` | `Hủy` đóng dialog, mở lại rỗng | ID-45 | H.1, SM-001 |
| C09 | `@auth` | Toolbar có đúng 6 nút; bôi đen text rồi click `B` → `inputValue()` của textarea bọc `**…**` | ID-27..32 | C.1-6, BR-005 |
| C10 | `@auth` | `Tiêu chuẩn cộng đồng` là `<a href="/standards">`, cùng tab (không `target="_blank"`) | *(không TC)* | FR-204 |
| C11 | `@auth` | Dòng hint dưới textarea đúng nguyên văn, và **không** có element counter ký tự nào | ID-5 | D.1 |
| C12 | `@auth` | Click `+ Hashtag` → picker mở; chọn/nhập `TeamWork` → chip xuất hiện | ID-34 | E.2, FR-205 |
| C13 | `@auth` | Thêm 3 hashtag → 3 chip; click `x` chip đầu → chip đó mất, 2 chip còn lại nguyên | ID-35, ID-36 | FR-205 |
| C14 | `@auth` | Đã 5 chip → thêm cái thứ 6 bị chặn, hiện `Tối đa 5 hashtag` | ID-16, ID-17, ID-53 | FR-403, BR-002 |
| C15 | `@auth` | `setInputFiles` 3 file `.jpg`/`.png` → 3 thumbnail, nút `+ Image` vẫn hiện | ID-18, ID-22, ID-37 | F.2-5, FR-206 |
| C16 | `@auth` | 5 ảnh → `+ Image` **ẩn**; xoá 1 thumbnail → nút hiện lại | ID-20, ID-38, ID-39, ID-54 | BR-003, FR-206 |
| C17 | `@auth` | Chọn file `.txt` → hiện lỗi định dạng, **không** thumbnail nào được thêm | ID-55 | FR-404, BR-003 |
| C18 | `@auth` | Tick checkbox → ô tên ẩn danh hiện; bỏ tick → ô mất | ID-41, ID-43, ID-44 | G, DEC-001, FR-207 |
| C19 | `@auth` | Tick ẩn danh + để trống tên + 4 trường kia hợp lệ → click `Gửi` bị chặn, lỗi ngay tại ô tên | *(D001)* | BR-004, D001 |
| C20 | `@auth` | Để trống cả 4 trường → click `Gửi` → lỗi hiện ở **cả 4** trường, dialog không đóng, không request nào đi | ID-7, ID-11, ID-14, ID-50..52, ID-56 | FR-402, DEC-002 |
| C21 | `@auth @local-db` | Gõ vào ô Người nhận → dropdown liệt kê Sunner thật đã seed; chọn 1 → ô hiện tên đó, dropdown đóng | ID-25, ID-26 | B.2, FR-202 |
| C22 | `@auth @local-db` | Đủ 4 trường hợp lệ → `Gửi` mất `aria-disabled` | ID-49 | FR-208, H.2 |
| C23 | `@auth @local-db` | Happy path: gửi → dialog đóng, thẻ kudo mới có mặt trên feed `/kudos` với `Danh hiệu` là hashtag đầu, đúng nội dung và chip | ID-15, ID-46, ID-47 | FR-401, BR-001 |
| C24 | `@auth @local-db` | Gửi kèm 2 ảnh → thẻ mới hiện 2 ảnh, `src` trỏ `/storage/v1/object/public/kudo-images/` | ID-18..24 | FR-001, INT-001 |
| C25 | `@auth @local-db` | Gửi ẩn danh + tên ẩn danh → thẻ mới **không** chứa tên thật người gửi, hiện tên ẩn danh, và tên đó **không** phải `<a href="/profile?id=">` | US004 | BR-004, permissions § ẩn danh |
| C26 | `@auth @local-db` | Nội dung có `**x**` → thẻ mới render `<strong>`, **không** hiện `**` thô | ID-27..32 | BR-005 |
| C27 | `@auth @local-db` | Gõ `@Ngu` trong textarea → danh sách gợi ý tên hiện; chọn 1 → chèn plain `@Tên` vào textarea | ID-33 | D, FR-204 |

## Implementation Steps

1. Preflight: **KHÔNG kill port 3000** (đang là dev server của project khác — `aimo-parking-lessor-client`, Next 14). Dùng `E2E_PORT=3100` cho mọi lệnh Playwright: Playwright tự spawn `pnpm dev --port 3100`. Rồi `curl -s http://127.0.0.1:55321/auth/v1/health` phải 200 (instance local `saa-app`).
2. Parse 57 TC + 26 spec item bằng python `csv`, chép chuỗi ra file spec bằng copy/paste — không gõ tay.
3. Tạo `tests/e2e/kudos-compose.spec.ts`: header comment mang **nguyên bảng C01–C27**, rồi 3 `test.describe` theo 3 tầng tag. Tag nằm trong **tiêu đề test** (đúng cách `profile.spec.ts` làm) để `--grep-invert` bắt được.
4. Khối CI-safe mở đầu `test.use({ storageState: { cookies: [], origins: [] } })`.
5. Khối `@auth` dùng `createTestSession` + `injectSupabaseSession`; email chưa từng tồn tại, `full_name` truyền qua metadata (trigger `0002` dùng `ON CONFLICT DO NOTHING`).
6. C15/C16/C17 tạo file tạm bằng `setInputFiles({ name, mimeType, buffer })` — không cần fixture trên đĩa.
7. Chạy `E2E_PORT=3100 pnpm exec playwright test tests/e2e/kudos-compose.spec.ts`, ghi `redTestFiles`/`redCommand`/`redExitCode`/`redFailure` vào `evidence/red-evidence.md`.

## Todo List

- [ ] Preflight port 3000 + Supabase health 200
- [ ] Parse CSV bằng python, đối chiếu đủ 27 dòng hợp đồng
- [ ] Header comment bảng C01–C27 + 3 describe theo tag
- [ ] Chạy spec → đỏ vì assertion, không vì hạ tầng
- [ ] `E2E_PORT=3100 pnpm exec playwright test --grep-invert "@auth|@local-db" --list` → xác nhận CI-safe của file này đúng **2** test
- [ ] `evidence/red-evidence.md` đã ghi 4 field
- [ ] `pnpm lint --max-warnings 0` + `pnpm format:check`

## Success Criteria

- `E2E_PORT=3100 pnpm exec playwright test tests/e2e/kudos-compose.spec.ts` thoát **khác 0**, log chỉ ra ít nhất 1 assertion `toBeVisible`/`toContainText` thất bại vì dialog không tồn tại.
- Đúng **2** test của file này lọt qua `--grep-invert "@auth|@local-db"` — không nhiều hơn.
- 6 spec cũ (`home`, `login`, `awards`, `standards`, `profile`, `kudos`) vẫn xanh nguyên: file mới chưa chạm gì của chúng.
- Không có `test.skip`/`test.fixme`/`waitForTimeout` nào trong file.

## Risk Assessment

| Rủi ro | KN | AH | Countermeasure |
|---|---|---|---|
| RED giả vì Supabase down chứ không vì dialog | TB | Cao — 5 phase Track A xây trên hợp đồng rỗng | Bước 1 bắt buộc `curl` health; nếu 000 thì `supabase start` từ repo root, **không** `db reset` |
| Tag đặt sai → `@auth` lọt vào job CI | TB | Cao — CI đỏ trường kỳ | Cửa cứng "đúng 2 test CI-safe" ở Success Criteria |
| Chép sai một ký tự (`“ ”` cong, dấu chấm cuối) | Cao | TB — GREEN không bao giờ tới | Bước 2 bắt copy qua python; lỗi assert bằng `toContainText` |
| `toBeDisabled()` không hiểu `aria-disabled` ở version này | TB | TB — C05/C22 sai kết quả | AD-1: assert thẳng `[aria-disabled="true"]`, không dùng matcher |
| C21/C27 flaky vì debounce 250ms (AD-6) | TB | TB | Auto-wait của locator / `expect.poll`, cấm `waitForTimeout` |

## Security Considerations

Đây là file test, không chạm dữ liệu thật. Nhánh `@auth` tạo `auth.users` mới qua helper — dùng domain email riêng để phân biệt với 8 Sunner demo của `0008` khi rollback. C25 là **assertion bảo mật**, không phải assertion trình bày: nó chứng minh view `kudos_cards` đã bịt đường rò `sender_full_name`; đừng làm yếu nó thành "chỉ kiểm UI có ẩn tên".

## Next Steps

Mở khoá toàn bộ phase còn lại. Phase 08–12 nhận file này ở dạng **read-only** và không được sửa; chỉ phase 15 (cùng owner `tester`) mới nhận lại quyền ghi.
