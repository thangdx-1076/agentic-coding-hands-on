---
title: "Viết Kudo — dialog soạn Kudo trên `/kudos`"
description: "Dialog `<dialog>` phủ trên `/kudos`: 4 trường bắt buộc (Người nhận, Danh hiệu, Nội dung, Hashtag), tối đa 5 ảnh lên Supabase Storage, gửi ẩn danh. Đường INSERT đầu tiên vào `public.kudos` — migration 0009/0010, policy ghi đầu tiên, và vá lỗ rò danh tính của view `kudos_cards`."
status: completed
priority: P1
effort: 17.25h
branch: feat/kudos-write-modal
tags: [kudos, next16, momorph, supabase, storage, rls, i18n, e2e-red-first]
created: 2026-09-08
work_type: feature
test_policy: e2e-red-first
momorph: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/ihQ26W78P2
clarifications: plans/260907-2338-kudos-write-modal/clarifications.md
spec: docs/vi/features/F009_KudosCompose/
system_draft: [plans/260907-2338-kudos-write-modal/spec/system/architecture.md, plans/260907-2338-kudos-write-modal/spec/system/permissions.md]
---

# Viết Kudo (F009 / SCR008) — implementation plan

`e2e-red-first`. Phase 01 (`tester`) viết `tests/e2e/kudos-compose.spec.ts` và **phải đỏ thật** trước dòng code đầu tiên — file đó là **hợp đồng DOM duy nhất** cho 5 phase Track A, đọc thẳng, không suy diễn lại. Khác F007 ở ba điểm: đây là **dialog, không phải route**; là **INSERT đầu tiên vào `public.kudos`**; và là lần đầu repo dùng **Supabase Storage**. Nền tảng nằm ở `clarifications.md` — 17 quyết định đã chốt, không mở lại. Thứ tự chạy: `01` → `02 ∥ 03 ∥ 04 ∥ 05 ∥ 08` → `06 ∥ 07 ∥ 09 ∥ 10 ∥ 11 ∥ 12 ∥ 14` → `13` → `15`; `13` là merge point duy nhất, và **không có rào chắn giữa Track A và Track B** sau phase 01.

## Phases

| # | Phase | Track | Owner | Status | Depends on | Effort |
|---|-------|-------|-------|--------|-----------|--------|
| 01 | [RED — `kudos-compose.spec.ts` + hợp đồng DOM](phase-01-red-e2e-compose-contract.md) | test gate | tester | completed | — | 1.5h |
| 02 | [Migration 0009 ghi+ẩn danh, 0010 bucket ảnh](phase-02-migrations-write-anonymity-bucket.md) | B | implementer | completed | 01 | 1.25h |
| 03 | [i18n leaf `kudos.composeModal` + copy contract](phase-03-i18n-compose-copy.md) | B | implementer | completed | 01 | 0.5h |
| 04 | [Logic thuần `_utils`: validate, marker, parser](phase-04-utils-validate-markdown.md) | B | implementer | completed | 01 | 1h |
| 05 | [DAL `sunner-search` + action tìm người nhận](phase-05-dal-sunner-search.md) | B | implementer | completed | 01 | 0.75h |
| 06 | [Server Action `create-kudo` + upload ảnh](phase-06-action-create-kudo-upload.md) | B | implementer | completed | 02, 04 | 1.5h |
| 07 | [Hooks: dialog, form draft, gợi ý người nhận](phase-07-hooks-compose-state.md) | B | implementer | completed | 04, 05, 06 | 1.25h |
| 08 | [Track A — vỏ dialog + field shell + options + footer](phase-08-track-a-dialog-shell.md) | A | momorph-ui-implementer | completed | 01, 03 | 1.25h |
| 09 | [Track A — Người nhận + Danh hiệu](phase-09-track-a-recipient-title.md) | A | momorph-ui-implementer | completed | 01, 03, 08 | 1h |
| 10 | [Track A — toolbar + textarea Nội dung](phase-10-track-a-content-editor.md) | A | momorph-ui-implementer | completed | 01, 03, 08 | 1.25h |
| 11 | [Track A — Hashtag + dropdown picker](phase-11-track-a-hashtag-picker.md) | A | momorph-ui-implementer | completed | 01, 03, 08 | 1h |
| 12 | [Track A — Image + checkbox ẩn danh](phase-12-track-a-image-anonymous.md) | A | momorph-ui-implementer | completed | 01, 03, 08 | 1h |
| 13 | [Lắp form + launcher + pill + thread props](phase-13-integration-form-wiring.md) | — | implementer | completed | 03, 05–12, 14 | 1.5h |
| 14 | [Hiển thị: ẩn danh qua DAL + renderer markdown trên thẻ](phase-14-display-anonymity-markdown.md) | — | implementer | completed | 02, 04 | 1h |
| 15 | [Temper — GREEN e2e + bằng chứng thị giác](phase-15-temper-green-visual.md) | — | tester | completed | 13 | 1.5h |

## File ownership (không phase nào chung file; path rút gọn = `src/app/(public)/kudos/`)

| Phase | Owns |
|-------|------|
| 01 | `tests/e2e/kudos-compose.spec.ts` *(tạo)* |
| 02 | `supabase/migrations/0009_kudos_write_anonymity.sql`, `supabase/migrations/0010_kudo_images_bucket.sql`, `evidence/migration-transcript.md` |
| 03 | `messages/vi.json`, `messages/en.json`, `_shared/kudos-compose-copy.ts` |
| 04 | `_utils/{validate-kudo-draft,validate-kudo-images,insert-markdown-marker,parse-kudo-markdown}.ts` + 4 `.test.ts` |
| 05 | `src/dal/sunner-search.ts(+test)`, `src/dal/sunner-search-client.ts(+test)`, `_actions/search-sunners.ts(+test)` |
| 06 | `_actions/create-kudo.ts(+test)`, `_actions/upload-kudo-images.ts(+test)`, `next.config.ts` |
| 07 | `_hooks/{use-kudos-compose-dialog,use-kudos-compose-form,use-sunner-suggest}.ts` + 3 `.test.ts` |
| 08 | `_components/{kudos-compose-dialog,kudos-compose-field,kudos-sunner-options,kudos-compose-footer}.tsx` + 4 `.stories.tsx` |
| 09 | `_components/{kudos-recipient-field,kudos-title-field}.tsx` + 2 `.stories.tsx` |
| 10 | `_components/{kudos-content-field,kudos-format-toolbar}.tsx` + 2 `.stories.tsx` |
| 11 | `_components/{kudos-hashtag-field,kudos-hashtag-picker}.tsx` + 2 `.stories.tsx` |
| 12 | `_components/{kudos-image-field,kudos-anonymous-field}.tsx` + 2 `.stories.tsx` |
| 13 | `_components/{kudos-compose-form,kudos-compose-body,kudos-compose-launcher,kudos-keyvisual-band}.tsx`, `_components/{kudos-compose-pill,kudos-screen,kudos-client}.tsx` *(sửa)*, `page.tsx`, `_shared/build-kudos-copy.ts` |
| 14 | `src/dal/kudos.ts(+test)`, `src/dal/kudos-cards-query.ts(+test)`, `_components/{kudos-card,kudos-card-person}.tsx`, `_components/kudos-card-person.stories.tsx`, `_components/kudo-markdown-text.tsx(+stories)` |
| 15 | `tests/e2e/kudos-compose.spec.ts` *(nhận lại từ 01 — tuần tự, cùng owner)*, `evidence/visual/**` |

## Quyết định chốt (đọc trước khi code)

- **AD-1 — nút `Gửi` dùng `aria-disabled="true"`, KHÔNG dùng `disabled`.** FR-208/spec H.2 đòi disable khi thiếu trường; FR-402/DEC-002/ID-56 đòi *bấm Gửi* rồi hiện lỗi ở từng trường. Một `<button disabled>` không nhận click nên hai yêu cầu loại trừ nhau. `aria-disabled` + style disabled + handler vẫn chạy validate là cách duy nhất thoả cả hai, và còn giữ được focus để trình đọc màn hình biết vì sao. Hợp đồng assert thẳng thuộc tính, **không** dùng `toBeDisabled()`.
- **AD-2 — vá view `kudos_cards` bằng đúng `CASE WHEN is_anonymous` trên 5 cột sender, KHÔNG thêm cột mới.** `sender_id → NULL` chính là tín hiệu duy nhất UI cần, nên `CARD_COLUMNS`/`KudosClient` (literal type của F007, `kudos-cards-query.ts:48-51`) không phải đổi. Blast radius còn: `sender_id: string | null` (`kudos-cards-query.ts:24`), `KudosPerson.id` (`kudos.ts:32`), một nhánh bỏ `<Link>` ở `kudos-card-person.tsx:89`. Không vá view thì ẩn danh là ẩn danh giả — `anon` gọi thẳng view vẫn đọc tên thật (permissions.md § cảnh báo). **Known limitation kèm theo**: kudo ẩn danh do chính mình gửi sẽ hiện nút tim enabled (client không còn cách nào biết), bấm thì `kudo_hearts_insert_own` (`0007:78-84`) chặn ở DB và UI không đổi — không phải bug mới.
- **AD-3 — HAI file migration, không phải một, cũng không phải ba.** `0009` = cột `is_anonymous`/`anonymous_name` + `CREATE OR REPLACE VIEW kudos_cards` + policy `kudos_insert_own` + `GRANT INSERT`: cột và view **phải cùng một file**, tách ra là mở một cửa sổ thời gian mà cột đã tồn tại còn view vẫn rò danh tính. `0010` = bucket `kudo-images` + 2 policy trên `storage.objects`: data-store khác, câu rollback khác, và mang một bẫy chỉ nổ trên hosted (owner của `storage.objects`) — tách ra để nó không kéo đường ghi `kudos` xuống cùng.
- **AD-4 — `experimental.serverActions.bodySizeLimit` là key đúng cho Next 16.3.4.** Đã đọc docs bundled `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md`: mặc định 1MB, nhận chuỗi kiểu `'3mb'`, và giới hạn tính trên **raw body kể cả overhead multipart** (docs khuyên chừa 10–20KB). Chốt: cap **5 MiB/file** ở cả client và server, `bodySizeLimit: "28mb"` (5×5 MiB ≈ 26.2 MB + chỗ chừa). Phase 06 vẫn phải mở đúng file docs đó xác nhận lại trước khi sửa `next.config.ts`, không tin dòng này thay cho docs.
- **AD-5 — upload xong TẤT CẢ ảnh rồi mới INSERT** (Q1 treo ở technical-spec § 5.3). Lỗi giữa chừng, hoặc INSERT lỗi → best-effort `remove()` các path đã lên, lỗi của bước dọn bị nuốt, action vẫn trả `{ok:false}`. Không bao giờ INSERT một hàng `kudos` thiếu ảnh rồi vá sau (permissions.md § fail-closed). Kèm **AD-6** (Q2 § 5.3): ô Người nhận **debounce 250ms, tối thiểu 1 ký tự** — không có precedent debounce trong repo, gọi Server Action mỗi keystroke là tốn vô ích; e2e chờ bằng auto-wait/`expect.poll`, tuyệt đối không `waitForTimeout`.
- **AD-7 — thêm `kudos-keyvisual-band.tsx` ở phase 13, và pill giữ nguyên `<input readOnly>`.** `kudos-screen.tsx` đang **197/200 dòng** và `kudos-client.tsx` **187/200** — không nhét thêm khối launcher vào được; rút khối banner+2 pill ra một component riêng là cách giữ trần 200 mà không phá thứ tự DOM C10 của F007. Pill thì **không** được đổi thành `<button>`: `kudos.spec.ts:101-120` (C03) assert `[data-testid=kudos-compose-pill] input` có `readonly` + placeholder nguyên văn, và `<input>` lồng trong `<button>`/`<a>` là HTML không hợp lệ — nên gắn `onClick`/`onKeyDown` + `aria-haspopup="dialog"` lên chính input readonly (pattern `notification-bell.tsx:70-71`), quyết định mở-dialog-hay-`/login` để ở launcher. Và **AD-8 — một module validate cho cả hai lớp** (`_utils/validate-kudo-draft.ts`, `_utils/validate-kudo-images.ts`). Client chặn trước, Server Action chạy lại **cùng hàm** — hai lớp, một luật, không viết hai lần (BR-002/BR-003 § 4.4 đòi đúng vậy). Validate tay theo `toggle-kudo-heart.ts:39`, **không** zod (zod chỉ là transitive dep của eslint).
- **Lệnh và quy ước**: một file e2e chạy bằng `E2E_PORT=3100 pnpm exec playwright test tests/e2e/kudos-compose.spec.ts` — `pnpm test:e2e -- <file>` **không** filter, nó chạy cả 135 test. Unit: `pnpm exec vitest run <path>`; gate `pnpm test:unit:coverage` là **100% trên allowlist `.ts`** (mọi `.ts` mới trong `_hooks`/`_utils`/`_actions`/`src/dal` phải có test cạnh nó, `.tsx` nằm ngoài allowlist). `pnpm lint --max-warnings 0`, `pnpm format:check`, `pnpm build` → `pnpm typecheck`, `pnpm build-storybook`. Migration: `supabase migration up` từ repo root, **không bao giờ `supabase db reset`**. File ≤200 dòng, kebab-case, named export, `"use client"` chỉ ở leaf tương tác.

## Out of scope (không mở lại)

- **Không** rich-text editor thật (ID-27..32 mô tả in đậm ngay trong ô soạn thảo; một `<textarea>` — đúng thứ design vẽ — không render nổi inline style, nên định dạng hiện ở thẻ kudo sau khi gửi, BR-005), **không** bộ đếm ký tự (D.1 rỗng cột `maxLength`), **không** mention entity/link (lưu plain `@Tên`), **không** lightbox ảnh. **Không** policy `UPDATE`/`DELETE` trên `kudos`; **không** `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY`; **không** thêm `/kudos` vào matcher `src/proxy.ts`; **không** sửa `src/dal/profile-cards.ts`; **không** nới SELECT list của `profile_cards` (SEC_004).
- **Ba frame không có node data** — dropdown gợi ý người nhận (`QIMJNgFb8K`/`zJzaC9GgXt`), state lỗi validation (`5c7PkAibyD`), state đã tick ẩn danh (`p9vFVBE_tc`). Theo pattern repo (`kudos-sunner-search.tsx`, `login-error-alert.tsx`, `kudos-filter-menu.tsx`), **không đoán số đo**; phase nào dựng thì nói rõ trong file của mình. Promote spec/system draft sang `docs/vi/**` và cấp mã F###/SCR###/US###/PERM### thuộc bước promote.

## Rollback

Mỗi phase lùi độc lập; không phase nào phá `/`, `/login`, `/todo`, `/awards`, `/standards`, `/profile`, và `/kudos` vẫn render y như hôm nay cho tới phase 13. 01/15 = xoá spec · **02 = `DROP POLICY kudos_insert_own ON public.kudos; REVOKE INSERT ON public.kudos FROM authenticated;` + `CREATE OR REPLACE VIEW public.kudos_cards` về đúng bản `0006:82-101` + `ALTER TABLE public.kudos DROP COLUMN is_anonymous, DROP COLUMN anonymous_name;`; `0010` lùi riêng: `DROP POLICY` 2 cái trên `storage.objects` + `DELETE FROM storage.buckets WHERE id='kudo-images';` (xoá object trong bucket trước, nếu đã có)** · 03–12 = revert commit, chưa file nào được `page.tsx` render nên `/kudos` không đổi · 13 = revert commit → pill quay lại `<input readOnly>` · 14 = revert commit → thẻ kudo quay về render `{card.content}` plain text.

## Delivery

**RED → GREEN path** (e2e-red-first contract):
- Phase 01 RED: `E2E_PORT=3100 pnpm exec playwright test tests/e2e/kudos-compose.spec.ts` exit 1, C01 first-failure `expect(page).toHaveURL(/\/login/)` timeout (dialog not yet built)
- Phase 15 GREEN: same command exit 0, 27/27 PASS (C01–C27 all green)

**Evidence**: `evidence/red-evidence.md` (phase 01 red output), `evidence/green-evidence.md` (phase 15 green output + visual captures + security queries), `evidence/temper-results.json`, `evidence/migration-transcript.md` (live DB proof)

**Committed mid-forge** (2 commits):
- Phase 14: `src/dal/{kudos,kudos-cards-query}.ts` + `_components/{kudos-card,kudos-card-person,kudo-markdown-text}.tsx`
- Phase 06: `next.config.ts` (image remotePatterns + dangerouslyAllowLocalIP)

**Regression** (6 existing specs, all green):
- `home.spec.ts`: 27 ✓
- `awards.spec.ts`: 12 ✓
- `standards.spec.ts`: 14 ✓
- `profile.spec.ts`: 22 ✓
- `kudos.spec.ts` (F007): 28 ✓ — unmodified, C03 pill readonly + C10 DOM order both confirmed green
- `login.spec.ts`: 28 ✓

**Final gate** (all clean, exit 0):
- `pnpm build` ✓
- `pnpm typecheck` ✓
- `pnpm lint --max-warnings 0` ✓
- `pnpm format:check` ✓
- `pnpm test:unit:coverage` — 100% (61 files, 496 tests) ✓

**riskGate**: human sign-off pending (merge to main).
