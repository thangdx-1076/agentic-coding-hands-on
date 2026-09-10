---
title: "Docs sync — README + spec layer: hai nguyên nhân hệ thống, và vì sao spot-check của agent bỏ lọt đúng chỗ quan trọng"
date: 2026-09-10
time: "18:08 → 19:25"
tags: [docs-sync, doc-drift, agent-verification, route-colocation, mechanical-verification, ship]
severity: medium
---

# Tóm tắt

Commission: update README, kiểm tra lại các màn khác, đưa docs về đồng bộ với code.

README lúc bắt đầu: tiêu đề còn là "SAA 2025 — Login", ghi 5 route (thực tế 9), 3 migration (thực tế 13), "19 test file" (thực tế 83), mục Docs liệt kê F001–F003 trong khi đã có F012.

Nhưng phần đáng ghi lại không phải các con số lệch. Là **hai nguyên nhân hệ thống** đứng sau chúng, và chuyện **cách kiểm chứng quyết định việc tìm ra hay bỏ lọt lỗi** — spot-check của agent báo "clean" đúng ở những file có lỗi thật.

## Hai nguyên nhân hệ thống, không phải một đống typo

**1. Refactor để lại citation chết.** Route-colocation refactor (`plans/260906-1150-src-route-colocation-refactor/`) cộng với lần move sang `src/` trước đó đẩy code vào `src/app/(public|protected)/<route>/_components|_hooks|_actions/**`. Docs vẫn trỏ layout phẳng cũ: `app/login/page.tsx`, `components/home/home-screen.tsx`, `hooks/use-login-actions.ts`. ~43 tham chiếu. Người đọc lần theo thì không tìm thấy gì.

**2. Regeneration dừng ở F009 nhưng code chạy tới F012.** Một số artifact được giữ current tới F012 (`feature-list`, `screen-list`, `route-list`, `permissions-matrix`), số còn lại kẹt ở F009:

- `entities.md` thiếu hẳn `secret_box_openings` (migration 0011) và `notifications` (0012), vẫn ghi "Total Entities: 7"
- `api-map.md` thiếu 3 Server Action (`openSecretBoxAction`, `markReadAction`, `markAllReadAction`), vẫn ghi "Server Actions | 6"
- `traceability-matrix.md` chỉ có F001–F005 — 7 trong 12 feature không có dòng traceability nào
- `behavior-logic.md` ghi "N/A — no realtime patterns detected" trong khi `src/api/notifications.ts:154-176` có channel Supabase Realtime thật

## Bài học chính: mechanical check bắt được cái eyeball bỏ lọt

Hai audit agent đọc docs rồi báo cáo; ba writer agent áp findings. Cả hai audit đều kết luận F004–F012 và SCR004–SCR009 "spot-checked clean" (mỗi file 1–2 citation).

Không clean.

Cái bắt ra lỗi không phải đọc lại docs. Là một phép thử máy móc: trích **mọi** citation `src/**` trong toàn bộ `docs/` (strip fenced code block trước — nếu không sẽ dính template example), rồi test `[ -e ]` từng path.

```bash
for f in $(find docs -name "*.md"); do awk '/^```/{fence=!fence;next} !fence' "$f"; done \
 | grep -oE 'src/[A-Za-z0-9_()./-]+\.(ts|tsx|sql|json)' | sort -u > /tmp/cited.txt
while read -r p; do [ -e "$p" ] || echo "MISSING: $p"; done < /tmp/cited.txt
```

Ba cụm lỗi thật lộ ra ở đúng vùng vừa được báo "clean":

| Chỗ | Sai gì |
|-----|--------|
| `F004/technical-spec.md` ×4 | trỏ `src/app/(public)/_utils/get-viewer.ts`; thật là `src/app/_utils/get-viewer.ts` |
| `SCR004/spec.md`, `SCR005/spec.md` | bảng hành vi nói `/kudos` "chưa implement, hiện 404" — `/kudos` đang live |
| `F007/technical-spec.md` | frontmatter `status: implemented` nhưng thân bài mang **49** nhãn `(planned)` |

Kết quả cuối: 165 citation, 162 resolve, 3 là negative reference cố ý ("`src/middleware.ts` KHÔNG được tạo").

Điểm rút ra: với doc drift, **eyeball review và mechanical check không thay thế nhau**. Cái sau rẻ, chạy được trên toàn tree, và không mệt ở file thứ 40.

## Symbol rename núp sau path move

Sửa path thôi là chưa đủ — vài module bị **đổi tên**, không chỉ đổi chỗ:

- `getAuthenticatedUser()` **không còn tồn tại ở đâu cả** → `getCurrentUser()` (`src/dal/auth.ts:16`)
- `lib/auth/sign-in-with-google.ts` → `src/api/auth.ts` (export `signInWithGoogle`)
- `lib/auth/get-user-role.ts` → `src/dal/users.ts` (export `getUserRole`)
- `lib/countdown/countdown.ts` → `src/utils/countdown.ts`

Một lượt sed đổi path sẽ để nguyên tên hàm sai — doc trông đúng, dẫn tới hàm không tồn tại.

## Fail-open hay fail-closed: cả hai đều đúng, ở hai tầng khác nhau

Một agent để lại marker `[NEEDS_VERIFY]` thay vì tự kết luận, về việc guard `/todo` còn fail-closed không. Câu trả lời cần cả hai tầng:

1. `getCurrentUser()` (`src/dal/auth.ts:17-27`) bọc try/catch, fail **OPEN** về `null` cho mọi lỗi — Supabase outage không được phép làm sập trang.
2. `(protected)/layout.tsx` mới là chỗ biến `null` thành `redirect(ROUTES.LOGIN)`.

Hợp lại: mức route vẫn fail **CLOSED**. Cả "fail-open" lẫn "fail-closed" đều là câu đúng — về hai tầng khác nhau. Đó chính là kiểu câu làm người đọc hiểu sai, nên doc giờ viết rõ cả hai bước thay vì chọn một nhãn.

Ghi chú thêm: ship một doc còn nguyên marker `[NEEDS_VERIFY]` thì không phải là "đồng bộ". Marker được giải quyết tại chỗ, không đẩy sang phiên sau.

## Hai defect thật lộ ra nhờ đi viết docs

Không phải lỗi docs — lỗi code, chỉ là viết docs mới nhìn thấy:

1. **Link admin chết.** `src/app/_components/account-menu.tsx:94` render `href="/admin"` cho `role='admin'`, nhưng không có route `/admin` nào trong `src/app/**` và `ROUTES` (`src/constants/routes.ts`) không có key `ADMIN`. Mọi admin bấm vào đều 404. Plan `plans/260909-0204-admin-route-guard/` hoá ra là scaffold rỗng, chưa từng chạy — nên claim "chưa có route /admin" trong docs vẫn **đúng**, và chính nó giải thích cái 404.
2. **`promote-to-admin.ts` trỏ nhầm project.** `tests/e2e/helpers/promote-to-admin.ts:14-16` default `cwd` sang checkout `saa-app` anh em (`~/Desktop/Claude-and-mormoph/saa-app`). Thư mục đó **có tồn tại** — vấn đề không phải "không tìm thấy", mà là nó là một Supabase project **khác**: promote user ở đó không tác động tới stack trong repo này. Hoặc set `SAA_APP_DIR`, hoặc sửa default về repo root.

## Lỗi process của chính mình

Một lượt sửa path hàng loạt bằng `perl -pi` có file list quét trúng 3 file `docs/vi/generated/` mà một writer agent **đang ghi**. Kiểm lại sau đó: không có substitution nào xảy ra ở 3 file đó, không mất gì.

Nhưng thứ tự sai. Chạy bulk rewrite lên path thuộc ownership của agent khác là sai nguyên tắc, và cái check lẽ ra phải đứng **trước** câu lệnh chứ không phải sau.

## Agent bịa nội dung — và vì sao phải verify cả journal

Lần đầu `journal-writer` sinh ra file này, nó **bịa 6 path không tồn tại**, trong đó có nguyên một cặp finding chưa từng được báo cáo (`src/utils/get-viewer-profile.ts`, `src/app/(public)/login/hooks/use-session-storage.ts`). Nó cũng ghi thư mục F010/F011/F012 là "3 folder trống" — sai, các folder đó có sẵn `functional-spec.md` + `technical-spec.md`, chỉ thiếu `README.md`.

Phát hiện bằng đúng phép thử đã dùng cho docs — chạy path-existence check lên chính journal. 15 citation, 6 không tồn tại.

Journal nói về độ chính xác của tài liệu mà bản thân chứa finding bịa thì tự phủ định. File này được viết lại tay từ facts đã kiểm.

Nguyên tắc rút ra: **output của agent là draft, không phải evidence** — kể cả khi agent đó vừa làm tốt việc khác. Cùng một mechanical check nên chĩa vào cả sản phẩm của agent.

## Ship: branch đã merge từ trước

`/tkm:ship` pre-flight phát hiện branch đang đứng (`fix/kudos-hero-profile-search`) **đã merge vào main** qua PR #25. Locally nó hiện "5 commit ahead" cho tới khi `git fetch origin` — sau fetch: 0 ahead, 1 behind, `git merge-base --is-ancestor` xác nhận đã bị hấp thụ hoàn toàn.

Nếu cứ thế ship, PR mới sẽ replay commit đã merge. Work được chuyển sang branch mới `docs/sync-readme-and-spec-layer` cắt từ `origin/main` — commit khác biệt duy nhất là chính merge commit của PR #25, **0 file divergence**, nên 39 file uncommitted mang sang an toàn (đã diff hai danh sách file để chắc không overlap trước khi switch).

Bài học nhỏ: đừng tin số ahead/behind trước khi fetch.

## Gate lúc ship

| Gate | Kết quả |
|------|---------|
| `pnpm test:unit` | 808 passed / 0 failed, exit 0 |
| `pnpm lint --max-warnings 0` | exit 0 |
| `pnpm format:check` | clean |
| `pnpm build` | ✓ (route list emit đúng 9 route như README ghi) |
| `pnpm typecheck` | exit 0 |
| `pnpm build-storybook` | ✓ |
| SunLint | grade A+, 0 violation |
| licenseal | 0 violation / 0 gap / 0 unknown; 14 warning |

14 warning licenseal đều là `@img/sharp-libvips-*` LGPL-3.0-or-later, transitive qua `next`/`next-intl` cho image optimization — pre-existing, và branch này không đụng `package.json` lẫn `pnpm-lock.yaml`. Advisory, không block.

Không bump version: docs-only, không đổi hành vi sản phẩm, và lịch sử repo cho thấy 8 release commit trên 25 PR — bump bám theo product release, không theo từng merge.

## Bài học mang đi

1. **Mechanical check > eyeball** cho doc drift. Trích citation rồi test tồn tại; strip fenced block trước kẻo dính template example.
2. **Path move và symbol rename là hai lỗi khác nhau.** Sửa cái đầu mà quên cái sau thì doc vẫn dẫn tới hàm không tồn tại.
3. **Output của agent là draft.** Cả 4 writer agent đều có claim không sống sót qua kiểm tra; journal-writer thì bịa hẳn. Verify trước khi tin, kể cả với agent vừa làm tốt.
4. **Spot-check "clean" là bằng chứng yếu.** 1–2 citation/file không đủ kết luận cả file — và nó báo clean đúng ở 3 file có lỗi thật.
5. **Fetch trước khi đọc ahead/behind.**
6. **Ownership check đứng trước câu lệnh**, không phải sau.

## Artifacts

- `plans/reports/researcher-260910-1808-generated-docs-drift.md` — audit lớp generated (20 blocking + 11 minor)
- `plans/reports/researcher-260910-1808-feature-screen-system-docs-drift.md` — audit feature/screen/system (7 blocking)
- `plans/action-items.md` § `260910-1901` — decisions + việc cần người quyết
- Scope: 34 file modified, 3 file created (F010/F011/F012 `README.md`)
