# Spec Promote — F010_SecretBoxModal

Recipe: `spec-state-registration.md` § Promote — SINGLE, P0→P5 + Step 0 (NEW feature).
Docs root: `docs/vi/` (per `docs/vi/.rebuild-state.json` `primary_lang: "vi"`).

## Allocated code

**F010** (slug `F010_SecretBoxModal`). Step 0: read max fcode across
`docs/vi/_canonical-fcodes.json` (F009) and `docs/vi/generated/feature-list.md` (F009) → both
agree → `max+1 = F010`. Wrote reservation skeleton, re-read, count(F010) == 1 → unique, proceeded.

## Files written/modified

- `docs/.spec-promote-pending.json` — created (P1 sentinel, `run_type: "new"`, `screens: []`, left
  in place per recipe — orchestrator/Stage 6 deletes it, not me).
- `docs/vi/features/F010_SecretBoxModal/technical-spec.md` — copied from draft (P2); H1
  `F000_SecretBoxModal`→`F010_SecretBoxModal`; frontmatter `status: draft→implemented` +
  `fcode: F010` added (P4); inline `F000 (provisional)`→`F010` in Artifact References row.
- `docs/vi/features/F010_SecretBoxModal/functional-spec.md` — copied (P2); H1 remapped to
  `F010_SecretBoxModal`; frontmatter `status: draft→implemented` (no `fcode:` key — matches
  majority precedent F006/F007/F008, whose functional-spec.md omits `fcode:`; only F009 deviated
  by including one).
- `docs/vi/_canonical-fcodes.json` — Step 0 skeleton replaced by real entry (Step 2): name "Mở
  Secret Box trên /kudos", P2, mixed, `related.screens: [SCR007_KudosLiveBoard]` (reused screen,
  matches F008 precedent), other related arrays empty (no US/ROUTE/MODEL/BL/PERM codes registered
  yet — all "TBD (draft)" per source specs).
- `docs/vi/_source-to-fcode.json` — **not modified**. Step 3: no source files exist yet for this
  feature (git status confirms zero `src/`/`supabase/` changes this session — promote runs at
  spec-authoring/implement-start, before Track A/B code). Recomputed `fcode_index_sha` over the
  unchanged index → identical to stored value, confirming no drift.
- `docs/vi/.rebuild-state.json` — Step 4: `last_feature_spec_run_sha` → HEAD
  (`6c8ee574f62b134bb988d6429504101e8f2ca540`); `fcode_index_sha` rewritten (same value, per above).
  `doc_shas`, `last_rebuild_sha`, `screen_spec_shas` untouched (owned by core pass / Step 5-6).
- `docs/vi/generated/feature-list.md` (Step 8, LAST) — added F010 row to Feature Hierarchy table;
  appended `### F010:` Feature Details section after F009's (end of file, matching existing
  append pattern); updated `## Summary` counts/notes and `## Cross-Reference Validation` bullets
  to include F010 (Total Features 9→10; screens/routes/models/BL/perms notes extended). File now
  476 lines (was 419) — well under `docs.maxLoc: 800`, no split needed.
- `docs/vi/features/F010_SecretBoxModal/.pending` — created after Step 2, deleted after Step 9
  duplicate check passed.
- `plans/260908-1337-secret-box-modal/plan.md` — P5: frontmatter `spec_draft: ...` →
  `spec: docs/vi/features/F010_SecretBoxModal/`. Body prose (H1 area still says "chưa có F###...
  placeholder F000_SecretBoxModal") **left untouched** — out of scope for P5 (frontmatter-only)
  and not in the Hard Rules edit list; flagging for whoever next touches plan.md body.

## Steps 5 & 6 — SKIPPED, justified

No new screen: this feature is a modal on existing `SCR007_KudosLiveBoard`, draft has no
`screens/SCR-*/` folder, sentinel `screens: []`. Step 5's own header is "**(new screens only)**"
— doesn't apply. Step 6 computes a hash of "the SCR### section BODY" that Step 5 would have
appended; since Step 5 didn't run, there is no new section to hash, so Step 6 is a no-op by its
own dependency, not a judgment call.

## Step 9 — duplicate check: PASS

`F010` appears exactly once in `_canonical-fcodes.json.features[].fcode`; exactly once in
`feature-list.md`'s hierarchy table (`F010_SecretBoxModal` row) and once as a `### F010:` heading.
No new `SCR###` touched screen-list.md or `screen_spec_shas` (unaffected, still 8/5 entries resp.).

## Sentinel written (verbatim)

```json
{"fcode":"F010","run_type":"new","plan_dir":"plans/260908-1337-secret-box-modal","slug":"F010_SecretBoxModal","from":"plans/260908-1337-secret-box-modal/spec/secret-box-modal/","screens":[],"ts":"2026-09-08T09:00:55Z"}
```

## Out of scope, flagged (not done)

`plan.md` frontmatter also carries `system_docs:` pointing at
`spec/system/{permissions,architecture}.md` drafts — recipe § Promote — SYSTEM-DOC covers these,
but my task explicitly scoped me to "the SINGLE branch, steps P0→P5" for the feature only. I did
not touch `docs/vi/system/*`. If those system-doc drafts also need promoting, that's a separate
follow-up.

**Status:** DONE
