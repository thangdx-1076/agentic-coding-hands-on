# Doc sync — F010_SecretBoxModal (260908-1604)

## Verdict

Promote-flipped `status: implemented` had left 4 docs self-contradicting the shipped code
(claiming "draft/not merged/no code yet" while frontmatter said implemented). Fixed all four.
`functional-spec.md`, README/index files, changelog-family docs (absent, confirmed), overview.md
(pre-existing unrelated staleness) — no changes.

## Files changed (docs only)

1. **`docs/vi/features/F010_SecretBoxModal/technical-spec.md`**
   - § 4.1 Components: `SecretBoxModal`/`secret-box-modal.tsx` → real `SecretBoxDialog`/
     `secret-box-dialog.tsx`; added missing real rows (`openSecretBox`/`toSecretBoxClient` DAL,
     `secretBoxBadgeAsset`/`isBadgeKey`); removed the false "SECRET_BOX_BADGES dời sang
     `src/app/_shared/secret-box-copy.ts`" row — that move never happened.
   - § 5.2 Assumptions: corrected the now-disproven "cần dời badge table" assumption — real code
     redeclares 6 badge keys locally in `_utils/secret-box-badge-asset.ts` instead, `standards-copy.ts`
     untouched.
   - § 5.3 Unresolved Questions: both marked RESOLVED — verified `messages/en.json` has all 6
     `standards.secretBoxSection.badges.*` keys, and `open_secret_box()`'s real
     `RETURNS TABLE (badge_key text, unopened int)` matches the sketch.
   - § 5.4 Source References: replaced "chưa có source code nào được viết" (flatly false under
     `status: implemented`) with the verified real file list, flagging the 2 wrong paths from the
     draft.

2. **`docs/vi/generated/feature-list.md`** — F010's Components paragraph said "planned, code chưa
   tồn tại"; replaced with the verified real file list (same corrections as above).

3. **`docs/vi/system/permissions.md`** / **`architecture.md`** — both carried a leftover
   `FORWARD-DRAFT NOTICE` HTML comment and a `[SecretBoxModal draft — chưa merge]` blockquote
   inside their own `status: implemented` files (self-contradiction, same pattern as the 2026-09-08
   FAB lesson in memory). Reworded both to "reconciled/merged," pointed at the real `F010` code now
   registered in `feature-list.md`. Also fixed 2 broken citations found while verifying:
   `kudos-stat-list.tsx:78-81` → `:65-68` (real `if (!stats) return null` location), and
   `page.tsx:146-147` (out of range — file is 143 lines) → `page.tsx:78` (`buildViewerStats` call).

## Verified against real code (no change needed)

Badge odds/weights, `pg_advisory_xact_lock`, `SECURITY DEFINER` + `SET search_path`, `REVOKE`/
`GRANT EXECUTE ... TO authenticated`, entitlement formula, log-table-not-counter rationale, all 6
badge PNGs pre-existing at `public/standards/`, bilingual `kudos.secretBox.*` copy — all match the
architecture.md/permissions.md prose already there. `functional-spec.md` has no file-path claims,
found no contradiction, left untouched.

## Checked, no update needed

- `docs/project-changelog.md`, `development-roadmap.md`, `system-architecture.md`,
  `code-standards.md` — confirmed absent (repo has never had these), per prior session's note.
- `README.md`, `docs/README.md`, `docs/vi/README.md` — generic nav/index, no per-feature content.
- `docs/vi/system/overview.md` — pre-existing staleness independent of this diff (still describes
  a smaller app, unreconciled since F003 per memory); not this diff's job, flagged as advisory only.

## Advisory (not acted on, out of scope for a surgical pass)

- Root `README.md`'s route table has no `/kudos` or `/profile` row at all — chronic gap predating
  F007-F009, not introduced by this diff. Recommend `/tkm:rebuild-spec` or a manual README pass.
- `docs/vi/generated/screen-list.md` still under-counts screens (flagged in a prior session,
  unrelated to F010).

**Status:** DONE
