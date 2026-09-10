# Claim đã tự xác minh (orchestrator) — 260910-2010

Chỉ ghi những claim tôi tự chạy lại, không copy từ agent.

## XÁC NHẬN ĐÚNG

| # | Claim | Bằng chứng tôi chạy |
|---|---|---|
| V1 | `messages/en.json` còn 7 chuỗi tiếng Việt | python scan diacritic: `kudos.banner.title`, `kudos.compose.placeholder`, `kudos.heroSearch.placeholder`, `kudos.heroSearch.ariaLabel`, `kudos.spotlight.searchPlaceholder`, `kudos.feed.empty`, `kudos.sidebar.emptyBoard` (191 leaf) |
| V2 | `messages-parity.test.ts` không thể bắt V1 | `flattenKeys()` chỉ so tập key, bỏ qua value — `src/lib/i18n/messages-parity.test.ts:24-40` |
| V3 | nav copy tự mâu thuẫn | `src/app/_shared/site-chrome.ts:67-68` comment nói spec A1.3/7.3 + TC ID-21/23 thắng (số nhiều), dòng `:69` set `"Award Information"` số ít. Cùng chuỗi ở `messages/en.json:18`, `messages/vi.json:18` |
| V4 | header logo lệch spec | `width={52} height={48}` + `h-12 w-[52px]` vs spec A1.1/TC ID-8 = 64×60 |
| V5 | **6** assertion tautology (agent chỉ thấy 2) | `expect(page.url()).toContain("/")` tại `login.spec.ts:175,687` và `home.spec.ts:37,452,469,697`. Mọi URL đều chứa `/` → không thể fail |
| V6 | `[C26]` fixme lỗi thời | `tests/e2e/kudos.spec.ts:739` fixme vì *"Compose Kudo dialog not implemented"*, nhưng dialog đã có (`kudos-compose-dialog.tsx`, F009 done) |
| V7 | spec CSV không chốt được UI fidelity | 23 cột: No,itemId,nameJP,nameTrans,itemName,itemType,itemSubtype,buttonType,dataType,required,format,min/maxLength,defaultValue,validationNote,description,userAction,transitionNote,databaseTable/Column/Note,qa,spec_progress. **Không cột màu/font/spacing** |

## BÁC BỎ / THU HẸP

| # | Claim của agent | Thực tế |
|---|---|---|
| R1 | agent-1 gap#7: "EN state undesigned" | SAI — spec `hUyaaugye2` row A.2 tả rõ: cờ Anh + label EN, 110×56px, nền tối. Có design, code không làm |
| R2 | nav tiếng Anh trong `vi.json` là bug | KHÔNG phải — `About SAA 2025`, `Sun* Kudos` cũng tiếng Anh ở cả 2 locale → có chủ ý |
| R3 | "1007 test-case rows" (đếm bằng `wc -l`) | SAI — `wc -l` đếm newline trong ô CSV. Đếm đúng bằng csv parser: **253 rows** / **213 spec item** |

## Số liệu đúng của phạm vi audit

14 screen web phủ 8 hạng mục: **213 spec item**, **253 test-case row**.
Screen có spec nhưng **0 test-case** trên MoMorph: `hUyaaugye2`, `JWpsISMAaM`, `WXK5AYB_rG`,
`Sv7DFwBw1h`, `_hphd32jN2`, `p9zO-c4a4x`.

## Hệ quả cho tiêu chí "UI chính xác tuyệt đối so với Figma"

Không thể kết luận từ spec CSV (V7). Muốn chốt phải dùng `get_frame_image` /
`list_frame_styles` / `get_design_item_image` + capture Playwright rồi so trực tiếp.
Đây là việc của `tester` ở stage Temper, không phải của audit tĩnh.

## Bổ sung — Kudos board (tự xác minh 2012)

| # | Claim | Bằng chứng |
|---|---|---|
| V8 | Sub-feature 6 (Top 10 nhận quà) **chưa nối dây** | `kudos-client.tsx:188-189` hardcode `rankUps={[]}` `giftRecipients={[]}`. Không có DAL nào cấp dữ liệu |
| V9 | Ledger quà **đã có sẵn** → V8 làm được ngay | `supabase/migrations/0011_secret_box.sql:68-76`: `secret_box_openings(id, user_id, badge_key, opened_at)`. RLS own-rows-only → cần view/RPC SECURITY DEFINER |
| V10 | Comment biện minh ô rỗng là lỗi thời | `kudos-leaderboard.tsx:14-16` "neither a rank-tracking nor a gift ledger exists yet" — trái V9 |
| V11 | `spotlightTotal` + option filter bị chặn ở 1000 | `supabase/config.toml:18` `max_rows = 1000`; `src/dal/kudos.ts:103` `selectCards(client, {})` không limit/order, `:130` đếm bằng `.length`, `:134-139` lấy option từ cùng mảng đã bị cắt |

Ghi chú V8/V9: rank-up thì đúng là chưa có nguồn dữ liệu (không có bảng theo dõi
thăng hạng) — chỉ `giftRecipients` là làm được. Đừng gộp hai cái thành một.

## Wave 1 — kiểm chứng của orchestrator (2140)

### Phase 05 — XÁC NHẬN XONG THẬT
Tự chạy lại, không tin báo cáo: `messages/en.json` 191 leaf, **0** leaf tiếng Việt
(scan diacritic). `pnpm test:unit src/lib/i18n/messages-parity.test.ts` → 3/3 pass.
Commit `02bd237` tồn tại. Guard là value-based, dùng character class tường minh
(không phải `[^\x00-\x7F]`) nên không false-positive trên `…`/emoji đã có sẵn trong en.json.

### Hai nhãn sai trong báo cáo phase 05 — đừng chép lại

**1. "7 e2e failures là pre-existing/environment flake" — SAI.**
Nhìn tên test là ra: `prelaunch-lock.spec.ts PL1-3` là RED của phase 04 đang làm;
`kudos-compose C20` là RED tôi vừa cho `tester` viết cho phase 11 (còn chờ implement);
`kudos.spec C14/C15` thuộc vùng phase 01 đang sửa. Đây là **RED có chủ đích của các
phase song song**, không phải flake. Nhãn "flake" đúng là cái bẫy mà
[[verify-agent-red-claims-before-routing]] đã dặn.

**2. Cách chứng minh "baseline tệ hơn" không có giá trị.**
Agent stash **chỉ 2 file của chính nó** rồi gọi lượt chạy đó là baseline — trong khi
edit của 3 phase khác vẫn nằm nguyên trên đĩa. Đó không phải baseline. Kết luận
"change của tôi không gây lỗi" tình cờ đúng (grep 7 key → 0 match trong spec đỏ),
nhưng lập luận thì không chứng minh được gì.

**Hệ quả:** không phase nào được tự tuyên bố e2e xanh trong lúc còn phase khác chạy.
Lượt full e2e duy nhất có giá trị là lượt orchestrator chạy ở Temper, sau khi cả 12
phase đã land và cây làm việc đứng yên.

### Rủi ro phối hợp tự gây ra — ghi lại để lần sau đừng lặp
Thả 5 agent song song mà 4 trong số đó chạy `pnpm test:e2e` → tranh port 3000,
`reuseExistingServer` khiến chúng lái server của nhau, và phase 04 sửa
`playwright.config.ts` ngay trong lúc phase 09 + tester đang chạy. Đúng ra nên: chỉ 1
agent được chạy full e2e tại một thời điểm, hoặc giao mỗi agent một `E2E_PORT` riêng,
hoặc để orchestrator độc quyền lượt e2e.

## TÔI SAI — second dev server (2148)

Ở mục trước tôi viết rằng memory sai và "Next 16.3.4 cho chạy 2 `next dev` cùng directory".
**Điều đó sai. Memory gốc đúng.** Và tôi đã đưa dữ kiện sai này vào brief của phase 04.

**Phép đo sai ở đâu:** tôi chạy `grep -q "Ready in" log && kill`. Server thứ hai **có** in
`✓ Ready`, nên grep khớp, và tôi kill nó trước khi dòng abort kịp xuất hiện. Tôi kết luận
"cả hai Ready ⇒ claim sai".

**Đo lại cho tử tế** (chờ 12s sau "Ready", đọc tail log, curl cả hai port):

```
✓ Ready in 744ms
✓ Running next.config.ts took 67ms
⨯ Another next dev server is already running.
- Local: http://localhost:3100
- PID:   14529
- Dir:   /Users/.../agentic-coding-hands-on
ELIFECYCLE  Command failed with exit code 1
```
`curl localhost:3101` → `000` (không có gì lắng nghe). `curl localhost:3100` → `200`.
Lock là `.next/dev/lock`, khoá theo **directory, không theo port**.

**Ai đúng:** agent phase 04. Nó tự đo kỹ hơn tôi và viết đúng vào comment của
`playwright.lock.config.ts`, rồi thiết kế config riêng thay vì `webServer` thứ hai —
là cách duy nhất chạy được. Tôi giữ thiết kế của nó.

**Bài học rộng hơn bản thân Next:** "process in ra dòng thành công" ≠ "process đang serve".
Phải probe port, đừng đọc lời chào. Đã ghi vào memory kèm cách đo đúng, để lần sau
không ai lặp lại phép kiểm nông này.
