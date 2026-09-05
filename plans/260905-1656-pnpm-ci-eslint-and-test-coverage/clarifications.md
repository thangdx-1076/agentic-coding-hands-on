# Clarifications — pnpm + CI + ESLint + test coverage

Authoritative decision log. Do not re-ask anything settled here.

## Session 2026-09-05

### Stage 1 rest point — scope decisions

- Q: Phát hiện thiếu test — xử lý trong lần chạy này luôn hay chỉ báo cáo? → A: **Viết bù top 3.** E2E đi thật qua `/auth/callback`, click logout thật, mô phỏng Supabase chết (nhánh fail-open/fail-closed). Kèm 1 unit test parity key `messages/{vi,en}.json` + bật coverage tooling.
- Q: E2E trong CI cần Supabase sống — giải quyết sao, biết quyết định cũ là KHÔNG `supabase init` trong app? → A: **Tách suite CI-safe.** Giữ nguyên quyết định 04/09. CI chạy tập không cần Supabase; các test cần Supabase đánh dấu local-only. Giới hạn này phải được ghi rõ trong workflow, không để im lặng.
- Q: Bộ ESLint lấy đến mức nào? → A: **Đầy đủ như đề xuất.** `recommendedTypeChecked` + `import/order` + `jsx-a11y/recommended` + `eslint-plugin-playwright` + `@vitest/eslint-plugin` + Prettier/`eslint-config-prettier`.
- Q: Commit đợt việc phiên trước trước khi đổi pnpm? → A: **Commit trước.** Đã xong — 7 commit (`caf7eb7`, `6305367`, `caeaa6d`, `1fcd214`, `0158522`, `a2e7b16`, `9c1fa00`).

### Stage 1.5 scope gate

- Q: Việc hạ tầng này có nên thành feature `F###` trong `docs/vi/features/` không? → A: **Không — chỉ forward-draft architecture.** Không cấp `F###`, không viết feature spec. `docs/vi/features/` giữ đúng 2 feature sản phẩm (F001, F002). Yêu cầu chi tiết nằm trong phase file của plan.
  **Lý do:** enumerate intents ra 4 workstream nhưng không cái nào là user-facing intent — không bộ ba `(actor, action-domain, outcome)` nào map tới screen-group hay API boundary. `F###` là vĩnh viễn (contiguity never forgets), nên không đưa hạ tầng vào feature-list sản phẩm. Xem `spec/.intent-enum.json`.

### Step 2b gap clarification

- Q: Tách suite CI-safe / local-only bằng cơ chế nào? → A: **Tag `@auth` + `--grep-invert @auth`.** Giữ 1 file `login.spec.ts`; tag hiện ngay tại test nên khó quên khi viết test mới. Không thêm Playwright project, không tách file.
- Q: Node version pin trong CI runner? → A: **Pin Node 24.** Khớp máy dev đã verify pnpm 10.33.2 chạy xanh, nằm trong range `engines.node: ">=22 <25"`. Không chạy matrix.
- Q: Job `e2e` trong CI cấp env Supabase thế nào? → A: **Placeholder giống job `quality`.** Hai biến `NEXT_PUBLIC_*` dùng giá trị placeholder ở cả hai job. Tập CI-safe chỉ cần `getUser()` fail gracefully. Không đưa secret thật vào CI — `saa-app` là instance local `127.0.0.1`, runner không với tới được nên secret thật vô dụng mà vẫn tăng bề mặt rủi ro.
- Q: Prettier reformat diff lớn cỡ nào — có cần giai đoạn warn-first không? → A: **Đo được, không cần warn-first.** `npx prettier@3 --check` trên phạm vi source thật (`app/`, `components/`, `lib/`, `i18n/`, `tests/`, `messages/`, config root) = **16 file**. Con số 126 file của lần quét đầu gồm markdown máy sinh trong `plans/`/`docs/` — những thứ này vào `.prettierignore`. 16 file đủ nhỏ để reformat trong một commit riêng rồi mới bật `--check` chặn CI.

## Known trade-off (recorded, not a gap)

Research report xếp hạng #1 là chạy `supabase start` trong job `e2e` để phủ đủ 23 test. Quyết định của người dùng là **không** — giữ nguyên nguyên tắc không `supabase init` trong app. Hệ quả đã biết và chấp nhận: **CI không phủ authenticated path**. Test E2E mới đi thật qua `/auth/callback` vì thế nằm ở nhóm local-only — tồn tại và chạy được ở máy dev, nhưng không gác PR. Workflow phải nói rõ giới hạn này.

## Unresolved Questions

Không còn — 4/4 gap của Step 2b đã đóng.

## Promote deviation (orchestrator decision, 2026-09-05 17:23)

Spec draft `spec/system/architecture.md` **KHÔNG được promote tại implement-start**, lệch với mặc định của `spec-state-registration.md § Promote — SYSTEM-DOC`.

**Lý do:** INVARIANT MED-3 trong chính thủ tục đó nói `system_docs` luôn phải là addendum của một feature sentinel, không bao giờ đứng một mình — nhánh recovery Stage 0 sẽ chạy `git checkout docs/features/<undefined>` nếu thiếu `fcode`. Thủ tục còn cảnh báo trước đúng trường hợp này: *"A future change that forward-drafts system docs on a waived/deliverable path would break this invariant."* Run này waive feature spec (xem Stage 1.5 scope gate ở trên), nên không có feature sentinel để đính vào.

**Hệ quả đã cân nhắc:** promote sớm sẽ khiến `docs/vi/system/architecture.md` tuyên bố pnpm + CI đã tồn tại trong khi chưa; phiên đứt giữa chừng = repo ship tài liệu sai. Draft KHÔNG phải input của implementation (phase file mới là), nên giữ nó ở plan dir không chặn việc gì.

**Đường đóng:** post-forge Core pass (takumi Step 6.a-pre gen gate → `/tkm:rebuild-spec`) regenerate `docs/vi/system/architecture.md` từ code as-built — chính xác hơn bản forward-draft. Draft ở lại làm chuẩn đối chiếu khi reconcile.
