# Doc sync: hero key-visual restore (2026-09-05)

Verified against source before writing: `components/login/login-background.tsx` (next/image, fill,
object-cover, sizes=100vw, src `/login/keyvisual.png`), `public/login/keyvisual.png` (confirmed on disk:
PNG 2882×2044), `tests/e2e/login.spec.ts` TC 5fbe2a18 (asserts `img[src*="keyvisual"]` count 1, GET
`/login/keyvisual.png` → 200 image/png, and `naturalWidth > 0`).

Per-file verdict:

- `README.md` — UPDATED. Removed the stale "not exported yet / gradient fallback" line under
  "Known gaps" (no longer true) and added an "## Assets" section stating the real state: file present,
  2× export of Figma node `662:14389`, served via next/image, with the provenance note (copied from
  sibling `saa-app` project, not re-exported here). File now 73 lines, well under the 800 ceiling.
- `docs/vi/generated/screen-list.md` — NO CHANGE. Only mentions hero at a high level (title/button);
  no claim about the key-visual asset being missing.
- `docs/vi/features/F001_GoogleOAuthLogin/functional-spec.md` — NO CHANGE. References hero
  title/description/button only; no asset-missing claim found.
- `docs/vi/features/F001_GoogleOAuthLogin/technical-spec.md` — NO CHANGE. Same as above.
- `docs/vi/system/*` — untouched per instruction (forward-authored, reconciled only by rebuild-spec).

Out-of-scope observation (not edited, flagged for follow-up): `docs/vi/screens/SCR001_Login/spec.md`
row E03 still says `asset public/login/hero-visual.* (TBD draft)` — wrong filename and stale "TBD"
status vs. the real `public/login/keyvisual.png`. This file wasn't in the requested review list; leaving
it for an explicit follow-up task since it's a screens/*/spec.md guardrailed-prose row edit.

**Status:** DONE
**Summary:** Updated README.md only (verdict: updated 1 file | no changes needed elsewhere).
**Concerns/Blockers:** `docs/vi/screens/SCR001_Login/spec.md` E03 row has a stale/wrong asset filename
(`hero-visual.*` vs actual `keyvisual.png`) and stale "TBD draft" status — out of this task's scope,
recommend a follow-up surgical edit.
