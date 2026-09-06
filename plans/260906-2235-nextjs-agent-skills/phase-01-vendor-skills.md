# Phase 01 — Install and commit-ready-ify 3 vendored skills

## Context

- Parent plan: [plan.md](plan.md)
- Reads: `.gitignore` (lines 51-65), `.prettierignore`, `eslint.config.*`
  (`globalIgnores`), one existing `SKILL.md` (e.g.
  `.claude/skills/nextjs-route-colocation-architecture/SKILL.md`) for the
  frontmatter shape (`name`, `description` required; `argument-hint`,
  `license`, `metadata` optional — repo convention, not a CLI requirement).

## Goal

Run the `skills` CLI once, then make the result committable, attributed, and
green on the repo's existing gates. No code in `src/` changes.

## Steps

1. **Install** — from repo root. `--skill` does NOT accept a comma-separated
   list: the CLI treats the whole string as one skill name and exits with
   `No matching skills found for: <the whole comma string>`. Repeat the flag
   once per skill instead. Verified working command:
   ```
   npx -y skills@1.5.23 add vercel-labs/agent-skills \
     -s vercel-react-best-practices \
     -s vercel-react-view-transitions \
     -s vercel-composition-patterns \
     --copy -y -a claude-code
   ```
   `-a claude-code` is correct (confirmed against the CLI's supported-agents
   table). Later updates go through `npx skills update`, not a re-add.

2. **Verify no clobber** — `git status .claude/skills/` must show only the 3
   new directories as untracked/new; the 5 existing ones (`.venv`, `devops`,
   `nextjs-route-colocation-architecture`, `search-docs`,
   `separate-hook-logic-from-components`, `takumi-flow`,
   `write-unit-tests-and-storybook-stories`) show no diff. If any existing
   dir changed, stop and report — do not overwrite.

3. **No symlinks** — `find .claude/skills/vercel-* -type l` must return
   nothing (the `--copy` flag should already guarantee this).

4. **Frontmatter check** — open each new `SKILL.md`; confirm valid YAML
   frontmatter with non-empty `name` + `description`. If either is missing,
   add the minimal field only — do not restyle to match the optional
   `license`/`metadata` fields the hand-authored skills use; that's
   embellishment, not a requirement.

5. **Unignore in git** — append 3 lines to `.gitignore` immediately after
   line 65 (`!.claude/skills/takumi-flow/`):
   ```
   !.claude/skills/vercel-react-best-practices/
   !.claude/skills/vercel-react-view-transitions/
   !.claude/skills/vercel-composition-patterns/
   ```
   Without this, the 3 directories stay invisible to `git add`.

6. **Attribution** — REVERSED at forge time: no notices file is created.
   Two reasons. (a) The session rule forbids creating markdown outside
   `plans/` and `docs/`, and `.claude/skills/THIRD_PARTY_NOTICES.md` is
   neither. (b) It would be duplication: every vendored `SKILL.md` already
   declares `license: MIT` in its own frontmatter (upstream sets it there —
   this is a stronger source than the upstream README, which is the only
   other place the license appears; the upstream repo ships NO `LICENSE`
   file and no `license` field in its `package.json`), and
   `skills-lock.json` already records `source: vercel-labs/agent-skills`
   plus `skillPath` and a content hash per skill. License + provenance are
   therefore already in-tree and machine-readable. The `.gitignore` comment
   added in step 5 points a human reader at both.

7. **Lock file** — if the CLI wrote `skills-lock.json` at repo root, leave it
   tracked (commit it) — it documents exactly what was installed for the
   next person who runs the CLI again. It is not caught by any `.gitignore`
   pattern, so no extra step is needed.

8. **Verify gates** (all must exit 0, unchanged from before this phase):
   ```
   pnpm format:check
   pnpm lint
   pnpm typecheck
   pnpm test:unit
   ```
   `.claude/**` is already excluded from prettier and eslint, so these
   should pass with zero new ignore entries. If `format:check` or `lint`
   still fails on the new files, that means the global `.claude/**` ignore
   didn't apply as expected — investigate before adding a narrower ignore
   rule (do not paper over with `.prettierignore`/`eslintignore` edits
   without understanding why the existing blanket rule missed them).

9. **Diff scope check** — `git diff --stat -- src/` must be empty.

## File ownership

This phase owns: `.gitignore`, `.claude/skills/vercel-react-best-practices/**`,
`.claude/skills/vercel-react-view-transitions/**`,
`.claude/skills/vercel-composition-patterns/**`, `skills-lock.json`.
Touches nothing else.

## Risks

| Risk | Likelihood | Impact | Countermove |
|---|---|---|---|
| CLI overwrites an existing skill dir with a name collision | Low | High | Step 2 diff check before proceeding; abort if any existing dir shows a change |
| `-a` agent token differs from assumed `claude-code` | Medium | Low | `--help` check in step 1 before running |
| Vendored markdown trips lint/format despite `.claude/**` ignore | Low | Low | Step 8 catches it immediately; investigate root cause, don't blanket-suppress |

## Test matrix

- **Static check only** (no unit/integration/e2e needed — this is file
  vendoring, not behavior): step 8's four commands are the full verification
  surface. `test:e2e` and `build` are not required by the acceptance
  criteria and are skipped to keep this lean.

## Rollback

```
git checkout -- .gitignore
rm -rf .claude/skills/vercel-react-best-practices \
       .claude/skills/vercel-react-view-transitions \
       .claude/skills/vercel-composition-patterns
rm -f skills-lock.json
```

## Done means (observable)

- [x] 3 real (non-symlink) directories under `.claude/skills/`, each with a
      valid-frontmatter `SKILL.md` — verified: find .claude/skills/vercel-* -type l returned 0; 
      inspection-verdict.json confirms all 3 have name, description, license: MIT in frontmatter
- [x] `.gitignore` has exactly 3 new unignore lines + 1 comment,
      nothing else changed — verified: 3 !.claude/skills/vercel-* lines + comment appended post line 65
- [x] No notices file (step 6 reversed); attribution verified instead as
      `license: MIT` in all 3 `SKILL.md` frontmatters + per-skill `source`
      in `skills-lock.json` — verified: inspection-verdict.json confirms "MIT license and upstream 
      source are recorded in-tree"; reviewer confirmed upstream ships no LICENSE file
- [x] `git status .claude/skills/` shows zero diff on the 5 pre-existing
      skill dirs — verified: temper-results.json shasum check shows "NO CLOBBER - all four 
      hand-authored skills byte-identical"
- [x] `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test:unit`
      all exit 0 — verified: temper-results.json 4/4 green; 124 unit tests baseline unchanged
- [x] `git diff --stat -- src/` is empty — verified: temper-results.json confirms empty diff
