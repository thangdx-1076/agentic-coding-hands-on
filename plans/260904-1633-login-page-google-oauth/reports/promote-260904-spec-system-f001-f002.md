# Promote report — SYSTEM spec F001–F002 + 2 system docs (2026-09-04 11:20Z)

Recipe: `spec-state-registration.md` § Promote — SYSTEM (S1–S6) + § SYSTEM-DOC (D1–D4) + Steps 0–9, hand-run (no `promote_drafts.py`). Greenfield (`docs/` absent → F11 skeletons).

## Allocated codes
- F### block (contiguous, max=0): **F001** → `F001_GoogleOAuthLogin` (P0, mixed), **F002** → `F002_LanguageSwitch` (P1, ui). Provisional→real map = identity. Both run_type `new` (no `fcode:` in drafts).
- SCR### (max=0): **SCR001_Login** (`/login`, ← `SCR-login`), **SCR002_Todo** (`/todo`, ← `SCR-todo`) — both owned by F001.
- Step 0 verify: F001 count=1, F002 count=1 → no collision.

## Files created under `docs/` (all new; sha256 in `shasum -a 256` output below)
| Path | Step |
|---|---|
| `docs/_canonical-fcodes.json` — 2 real entries (reservations replaced), sorted | 0 → 2 |
| `docs/.spec-promote-pending.json` — sentinel v2, **left in place** for Stage 6 | S3/D1 |
| `docs/_source-to-fcode.json` — `index: {}` (no source yet, RT-C5) | 1 → 3 |
| `docs/.rebuild-state.json` — `primary_lang: vi`, `fcode_index_sha: 44136fa3…ff8a`, `screen_spec_shas` SCR001=`869d2a0e…ee75`, SCR002=`12f52f46…17c4` (section-body hash, shasum cross-checked) | 1 → 4 → 6 |
| `docs/generated/screen-list.md` — `## SCR001_Login`, `## SCR002_Todo` sections | 1 → 5 |
| `docs/generated/feature-list.md` — 2 hierarchy rows + merged Feature Details; contiguity [1,2] OK | 1 → 8 |
| `docs/features/F001_GoogleOAuthLogin/{technical,functional}-spec.md` — tech-spec: `status: implemented`, `fcode: F001` | P2/P4 |
| `docs/features/F002_LanguageSwitch/{technical,functional}-spec.md` — tech-spec: `status: implemented`, `fcode: F002` | P2/P4 |
| `docs/screens/SCR001_Login/spec.md`, `docs/screens/SCR002_Todo/spec.md` — `fcode: F001` added, status stays `draft` (Step 7 shape) | P2 |
| `docs/system/architecture.md`, `docs/system/permissions.md` — verbatim copy, only `status: draft → implemented` | D2/D3 |
`.pending` markers created (Step 2) and deleted after Step 9 pass. `.scaffold-complete` plan markers NOT copied (not part of the 2-file set).

## Plan-dir files modified (drafts RETAINED, remapped in place per S4)
- `spec/googleoauthlogin/technical-spec.md`: H1 `# F000_Googleoauthlogin` → `# F001_GoogleOAuthLogin`; `SCR-login (draft)`×2 → `SCR001_Login`; `SCR-todo (draft)` → `SCR002_Todo`.
- `spec/googleoauthlogin/functional-spec.md`: `SCR-login (draft)`×2, `SCR-todo (draft)`×2 → real codes.
- `spec/googleoauthlogin/screens/SCR-login/spec.md`, `…/SCR-todo/spec.md`: H1 + `**Screen**` line + cross-refs → `SCR001_Login`/`SCR002_Todo`; `F001_GoogleOAuthLogin (draft)` → `F001_GoogleOAuthLogin`. Folder names `SCR-login`/`SCR-todo` kept (retention).
- `spec/languageswitch/technical-spec.md`: H1 `# F000_Languageswitch` → `# F002_LanguageSwitch`; `SCR-login / region` → `SCR001_Login / region`. `spec/languageswitch/functional-spec.md`: same region ref ×3.
- `phase-01-track-a-presentational-login-ui.md` L14: `SCR-login (draft)` → `SCR001_Login`. Phase-03/04 `SCR-login|todo` hits are file PATHS into retained folders — untouched. `spec/feature-list.md` unchanged (identity map).
- `plan.md` (S6) diff: L11 `spec_draft: plans/260904-1633-login-page-google-oauth/spec/` → `spec:` / `  - docs/features/F001_GoogleOAuthLogin/` / `  - docs/features/F002_LanguageSwitch/`. `system_drafts:` and all other keys/body untouched.

## Sentinel (`docs/.spec-promote-pending.json`)
```json
{"run_type":"system","plan_dir":"plans/260904-1633-login-page-google-oauth","ts":"2026-09-04T11:20:43Z",
 "features":[{"fcode":"F001","run_type":"new","slug":"F001_GoogleOAuthLogin","from":"plans/260904-1633-login-page-google-oauth/spec/googleoauthlogin/","screens":["SCR001_Login","SCR002_Todo"]},
             {"fcode":"F002","run_type":"new","slug":"F002_LanguageSwitch","from":"plans/260904-1633-login-page-google-oauth/spec/languageswitch/","screens":[]}],
 "system_docs":["docs/system/architecture.md","docs/system/permissions.md"]}
```

## S4 verification grep (`F[0-9]{3}` over plan-dir `spec/` + `phase-*.md`)
Tokens: F001×26, F002×23, F002_LanguageSwitch×11, F001_GoogleOAuthLogin×9. Non-range hits: `F003`×1 (rejected-split note in `feature-list-review.md`), `F001_Auth`/`F002_UserProfile`×1 each (format examples in draft feature-list preamble). `F000` remaining: none. Provisional SCR placeholders remaining: only the two folder-path refs (phase-03 L18, phase-04 L18). → PASS.

## Step 9 duplicate check
`_canonical-fcodes.json` F001=1, F002=1 · `feature-list.md` hierarchy rows F001=1, F002=1 · `screen_spec_shas` SCR001=1, SCR002=1 · `screen-list.md` `## SCR001`=1, `## SCR002`=1 → PASS; `.pending` ×2 deleted.

## Deviations / concerns (flag for orchestrator)
1. **Docs root**: `docs-canonical-mapping.md` § Modes says non-en single-lang (`primary_lang: vi`) resolves to `docs/vi/`; task explicitly directed `docs/`. Followed the task. If `_lang_lib.resolve_docs_root` is authoritative, the whole `docs/` tree needs relocating to `docs/vi/` before the next rebuild-spec run.
2. `last_feature_spec_run_sha` left `""` — HEAD unavailable (git forbidden; `.git/HEAD` read blocked by tooling). Stage 6 / next core pass should set it.
3. Recipe Step 8 skeleton header has 5 columns but its example row has 6 — wrote a 6-column header (`# | Code | Feature | Priority | Type | Status`). Row status set to `implemented` to mirror the P4 flip (recipe example shows `draft`).
4. Promoted tech-specs keep `[feature-list.md](../feature-list.md)` (§ 5.5) — now dangles from `docs/features/F###/` (would be `../../generated/feature-list.md`); preserved per P4 "preserve all other content".
5. F002 `related.screens` = `[]` in canonical JSON (partial-screen ownership, no REG### allocated); region recorded in prose in feature-list Details.
