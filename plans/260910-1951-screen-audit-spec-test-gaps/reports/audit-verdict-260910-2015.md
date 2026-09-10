# Kết luận audit 8 màn hình — 260910

Nguồn: 5 báo cáo audit trong `../research/`, spec MoMorph tải mới trong `../momorph/`
(14 screen web, 213 spec item, 253 test-case row), baseline trong `baseline-260910-1951.md`,
claim đã tự xác minh trong `orchestrator-verified-260910-2010.md`.

## Bảng điểm theo 3 tiêu chí

| # | Màn hình | UI vs Figma | Logic vs Spec | Unit+E2E TDD |
|---|---|---|---|---|
| 6 | Login | ⚠ GAP | ⚠ GAP (spec lệch, code đúng) | ⚠ GAP — 4 TC không test |
| 7 | Homepage SAA | ⚠ GAP — logo 52×48 vs 64×60 | ⚠ GAP — thiếu 1 dòng spec C1 | ⚠ GAP — 1 test vô nghĩa, 2 TC trống |
| 8 | Hệ thống giải | ⚠ GAP — typography caption, indicator | ✅ PASS | ⚠ GAP — 4/15 TC trống |
| 9 | Countdown Prelaunch | ⚠ GAP — 1 ô số/đơn vị vs 2 | ✅ PASS | ❌ **nav lock không có e2e nào** |
| 10 | Đa ngôn ngữ | ❌ **FAIL** — spec chưa từng được đọc | ❌ **FAIL** — EN còn 7 chuỗi tiếng Việt | ❌ **FAIL** — 0 e2e |
| 11 | Sun* Kudos | ⚠ GAP — dropdown filter | ❌ **FAIL** — 1 trong 6 tính năng chưa nối dây | ⚠ GAP — 20/41 TC đủ |
| 12 | Viết Kudos | ⚠ GAP — thiếu viền đỏ lỗi | ⚠ GAP — hashtag lệch 1 nhịp | ⚠ GAP — 51/57 TC |
| 13 | Like Kudos | ✅ PASS | ⚠ GAP — thiếu disabled khi đang gửi | ⚠ GAP — e2e chốt bị `fixme` |

Không hạng mục nào đạt cả 3 tiêu chí. **Không có gì đang vỡ** — baseline 808 unit +
217 e2e đều xanh. Toàn bộ là **thiếu**, và cái thiếu nằm đúng chỗ test hiện tại không soi tới.

## 3 lỗi nặng nhất

### 1. Hạng mục 11 — thiếu 1 trong 6 tính năng khách yêu cầu
"Top 10 sunners nhận quà mới nhất" render rỗng vĩnh viễn:
`kudos-client.tsx:188-189` hardcode `giftRecipients={[]}`. Không DAL nào cấp dữ liệu.
Comment ở `kudos-leaderboard.tsx:14-16` biện minh rằng "chưa có gift ledger" — **sai**:
`secret_box_openings(user_id, badge_key, opened_at)` đã có từ migration `0011`. Làm được ngay.

### 2. Hạng mục 10 — bật EN mà 7 chỗ vẫn tiếng Việt
`messages/en.json`: `kudos.banner.title`, `kudos.compose.placeholder`,
`kudos.heroSearch.placeholder`, `kudos.heroSearch.ariaLabel`,
`kudos.spotlight.searchPlaceholder`, `kudos.feed.empty`, `kudos.sidebar.emptyBoard`.
`messages-parity.test.ts` chỉ so *tập key* nên không bao giờ bắt được.
Thêm nữa: spec `hUyaaugye2` (cờ Anh cho EN, selected state, option 110×56) **chưa từng
được plan nào đọc** — code luôn hiện cờ Việt Nam, kể cả khi đang EN.

### 3. Hạng mục 9 — hành vi cốt lõi không có e2e
Prelaunch redirect gate: `prelaunch.spec.ts:128` chỉ test khi lock TẮT.
`playwright.config.ts` không bao giờ set `PRELAUNCH_LOCK_ENABLED`. `src/proxy.ts:49-67`
không có unit test. Tức là "luôn redirect về prelaunch trước giờ mở" — yêu cầu chính của
màn này — chưa từng được chứng minh.

## Lỗi hệ thống của bộ test (không thuộc màn nào)

- **6 assertion tautology**: `expect(page.url()).toContain("/")` tại `login.spec.ts:175,687`
  và `home.spec.ts:37,452,469,697`. Mọi URL đều chứa `/` → không thể fail.
  `home.spec.ts:469` (TC ID-3) chỉ có đúng assertion này → test rỗng nghĩa.
- **`kudos.spec.ts:739` `[C26]` `fixme` với lý do lỗi thời** ("compose dialog chưa có" —
  đã có rồi) → quy tắc "không tự tim kudo của mình" không có e2e nào chạy.
- **`max_rows = 1000`** (`supabase/config.toml:18`) làm `spotlightTotal` và danh sách option
  filter sai khi vượt 1000 kudo. Seed hiện tại còn xa 1000 nên không test nào bắt được.

## Vì sao tiêu chí "UI chính xác tuyệt đối" chỉ kết luận được một nửa

Spec CSV của MoMorph có 23 cột, **không cột nào là màu / font / spacing**. Mọi verdict UI ở
trên là "có/không có phần tử" và so với giá trị node thật khi agent lấy được, chứ không phải
so pixel. Muốn chốt tuyệt đối phải capture Playwright rồi so với `get_frame_image` —
việc đó thuộc stage Temper, làm sau khi sửa.

## Phân loại việc

| Nhóm | Số lượng | Ai làm |
|---|---|---|
| Critical — sai chức năng | 3 | code, phiên này |
| Major — lệch spec / thiếu test chốt | ~25 | code, phiên này |
| Minor | ~50 | nợ lại, ghi `action-items.md` |
| Spec MoMorph lệch (code đúng) | 9 | **người** — cần `upload_specs`, không tự sửa nguồn design dùng chung |
