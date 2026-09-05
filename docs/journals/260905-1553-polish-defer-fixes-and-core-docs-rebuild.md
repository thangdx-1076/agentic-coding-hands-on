---
title: "Polish defer fixes + core docs rebuild — focus leak found in live testing, schema trap recovered"
date: 2026-09-05
time: "14:41 → 15:53"
tags: [reviewer, tester, momorph-ui-implementer, keyboard-nav, unicode-hardening, rebuild-spec, schema-trap]
severity: medium
---

# Bối cảnh

Sau khi login F001/F002 shipped 2026-09-04, reviewer phát hiện 2 mục defer trong phase-05 (U+2028/U+2029 ký tự điều khiển, ARIA menu keyboard nav). Implementer đóng cả hai mục + tester chạy 9 test suite mới (8 keyboard E2E + 1 regression). Đồng thời, `/tkm:rebuild-spec --core` chạy full pass: 12 artifacts được promote từ draft → `docs/vi/`, system docs bỏ "chưa có code" token. Reviewer seal, evidence-gate pass hard, tsc/lint/build/vitest/playwright all GREEN. Recovery từ schema trap trong inspection-verdict.json. Final state: 9/10 SEALED (1 Defer thay vì 1 Accept).

---

## Hai mục defer đóng (nhưng một cái được mở lại vì bug thực)

### U+2028 / U+2029 — điều khiển ngập trong UTF-8

Reviewer concern: `safeNextPath` decode per-byte (`%XX` sequence), không thấy U+2028 (LINE SEPARATOR) vì nó là 3-byte UTF-8 (`%e2%80%a8`). Per-byte scan mỗi lần chỉ thấy từng byte riêng lẻ, không thấy cách byte ghép thành code point.

**Fix**: Thêm pass thứ hai — `decodeURIComponent` cả string rồi re-scan code point bằng `for (const char of raw)` (cú pháp này xử lý surrogate pair đúng, không phải `charCodeAt` cũ). Per-byte pass giữ nguyên vì nó bắt control-char đơn lẻ kể cả lúc malformed sequence làm `decodeURIComponent` throw.

**Bằng chứng**:
- `lib/supabase/next-path.ts` dòng 35-36: `LINE_SEPARATOR = 0x2028`, `PARAGRAPH_SEPARATOR = 0x2029`
- Dòng 43: `isForbiddenCodePoint()` reject cả hai
- Dòng 72-82: `hasEncodedForbiddenChar()` có per-byte pass + decoded pass
- 6 vitest case mới (các line 86-109 của `.test.ts`): raw + encoded U+2028, U+2029, false-accept guard, malformed-with-CR
- Toàn bộ 32/32 vitest GREEN

**Bài học**: Per-byte scan ≠ per-code-point scan. "Control char" write bằng ASCII term (`0x00-0x1f, 0x7f`) im lặng dừng ở 0x7f. Điều cần thiết ở chỗ giáp mối (header injection, URL redirect) phải tự đủ, không delegate error handling cho caller.

### ARIA APG menu roving nav — rồi find ra focus leak

Implementer implement full keyboard pattern: ArrowDown/Up (open + cycle), Home/End (jump), Escape (close + return focus), Tab (close, no return). Roving tabindex `(index === activeIndex ? 0 : -1)`. 22 test cũ all GREEN, 8 test keyboard E2E mới GREEN.

**Nhưng**: Reviewer built throwaway Playwright diagnostic chạy trực tiếp trên dev server, **tìm ra bug mà test suite không bắt**. Sequence: ArrowUp (mở menu → focus EN, `activeIndex=1`) → Escape (close) → **mouse click** (open) → **focus lại EN thay vì VN/first**.

**Nguyên nhân**: `onClick` là bare `setOpen((prev) => !prev)` không touch `activeIndex`, nhưng focus effect chạy trên EVERY open và vô điều kiện `itemRefs.current[activeIndex]?.focus()` dòng 54-57. Stale `activeIndex` từ keyboard session ghi nhận nhầm focus.

**Fix**: Mouse click route qua `openMenuAt(0)` thay vì bare toggle. Mọi open path đều reset `activeIndex`, focus leak chết.

**Regression test** mới (test 21 trong Playwright, `[REG 2026-09-05]`): chính xác reproduce sequence này, verify first item (VN) focus lần này, not EN.

**Bài học có thể chảy máu**: Khi component có 2+ input modality (keyboard + mouse), bug sống ở **transitions** giữa modality. Per-modality test suite **mù quàng** những cái này—22 test keyboard-first, 1 test click, nhưng 0 test keyboard-then-click. Reviewer không read spec, reviewer chạy code live, tìm ra lỗi code không thể tìm. Chất lượng review = hài hòa code + test + live experiment.

---

## Full `/tkm:rebuild-spec` core pass — 12 artifact + 3 schema trap

Session chạy `/tkm:rebuild-spec --core` (không `--artifact permissions` riêng lẻ vì nó ABORT nếu upstream missing). Toàn bộ core pass sinh 12 artifact (system overview, architecture, permissions + 10 generated: route-list, api-map, behavior-logic, entities, user-stories, feature-list, screen-list, screen-flow, permissions-matrix, traceability-matrix).

**3 trận schema trap tại đây:**

1. **Feature slug pinning** — `docs/vi/features/F001_GoogleOAuthLogin/` đã tồn tại trên disk. Canonical slug grammar dùng `features[].name` (tiếng Việt: "Đăng nhập Google OAuth", split trên non-`[A-Za-z0-9]` = "i_ng_nh_p_Google_OAuth" garbage). Phải **pin slug** bằng tay trong Wave 5 prompt để `F001_GoogleOAuthLogin` không bị orphan. Bài học: prompt phải biết slug sẽ bị split sai và chỉ định literal `slugs: ["F001_GoogleOAuthLogin", "F002_LanguageSwitch"]` nếu feature directory đã tồn tại.

2. **Heading count validator** — data-model draft failed contiguity check lần 1. Researcher dùng `### MODEL001_AppLocale` vừa ở entity definition vừa ở "Validation Rules" heading. Validator `count heading occurrences = definition sites` → nhầm tưởng entity đó định nghĩa 2 lần. Fix: template expect bare entity name ở mỗi heading, không tiền tố code. Trap áp dụng cho mọi entity (BL###, PERM###, SCR###, US###, F###).

3. **Venv unavailable** — kit venv `~/.claude/skills/.venv` không tồn tại, graphify MCP không có. Mọi rebuild-spec script chạy plain `python3`, Wave 0 dùng LLM scout thay vì graph shortcut. Chậm hơn nhưng không block.

**12 artifact promoted**: `docs/vi/system/overview.md`, `architecture.md`, `permissions.md` không còn "forward-draft, chưa có code" token. Nội dung giờ describe code thực tế đang chạy, dựng từ source/implementation đối với 2 screen (`/login`, `/todo`) và route phụ (`/`, `/auth/callback`).

---

## Schema trap riêng trong inspection-verdict.json

Tôi guide reviewer: "write `inspection-verdict.json` với keys `verdict`/`critical_count`/`warning_count`". Reviewer trung thực ghi đè existing file. Rồi `evidence-gate.cjs --stage hard` BLOCKED với 12 issue: schema thực tế là `decision`/`criticalCount`, `acceptanceCovered` entry PHẢI echo lại text criterion verbatim, `disposition` accept chỉ `Accept | Reject | Defer` (không `Resolved`).

**Recovery**: `git show HEAD:<path>` lấy original file back, update thay vì generate lại. Bài học: **never hand schema được invented cho file một deterministic gate validate**—đọc gate trước hoặc cho prior artifact làm schema, không tự sáng tạo.

Final state: `inspection-verdict.json` 9/10 SEALED, 0 critical (1 Defer ở U+2028 layer-3 encoding, accepted as same class as CR/LF boundary).

---

## Final state

| Thành phần | Trạng thái |
|-----------|-----------|
| `tsc --noEmit` | ✓ exit 0 |
| `npm run lint` | ✓ exit 0 |
| `npm run build` | ✓ exit 0 |
| `vitest run` | ✓ 32/32 (8 locale + 24 next-path) |
| `playwright test` | ✓ 23/23 (12 original + 8 keyboard + 1 regression) |
| evidence-gate hard | ✓ SEALED |
| reviewer | ✓ 9/10 SEALED |

---

## Còn mở (ghi rõ vì honest log)

1. **`docs/vi/features/{F001,F002}/*`** — 6 file vẫn `status: draft` dated 2026-09-04, mang ID incompatible với canonical code (US###/BL###/PERM### mới). Content đã "chưa có source code"/"TBD (draft)". Cần `/tkm:rebuild-spec --feature-specs` chạy lại (out of scope session này).

2. **`docs/vi/screens/{SCR001,SCR002}/spec.md`** — tương tự 6 file trên, vẫn forward-draft. Không có marker `.stale` ở `docs/vi/screens/` (chỉ có ở `docs/vi/features/.stale`).

3. **`last_feature_spec_run_sha`** — trong `.rebuild-state.json` vẫn empty string. Rebuild core không update nó, chỉ `/tkm:rebuild-spec --feature-specs` mới update.

---

**Evidence**: git diff across `lib/supabase/`, `components/login/`, `docs/vi/`, `plans/260904-1633-*/evidence/` folders; `plans/260904-1633-*/reports/{tester,reviewer,delivery-tracker,doc-writer}-260905-*.md`; `plans/260905-1447-rebuild-spec-core/plan.md` created; `evidence/green-run-polish.log` + `evidence/inspection-verdict.json` SEALED.

**Status:** DONE
**Summary:** Hai reviewer-defer item closed (U+2028/U+2029 control-char hardening + ARIA menu keyboard nav), nhưng review lộ ra focus-leak bug modal transitions → add regression test. Full core docs rebuild: 12 artifact promote, system docs reconcile. Schema trap trong inspection-verdict.json recover via `git show HEAD`. Final: 32/32 vitest + 23/23 Playwright GREEN, 9/10 reviewer SEALED, evidence-gate hard SEALED.
**Concerns/Blockers:** Feature spec run pending (out of scope, not blocking).
