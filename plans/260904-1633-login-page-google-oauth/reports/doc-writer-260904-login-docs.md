# Doc Writer — Login (260904-1633-login-page-google-oauth)

## README.md — UPDATED
Rewrote create-next-app boilerplate into the real project description: stack table, route table
(`/`, `/login`, `/auth/callback`, `/todo`), setup steps (local `saa-app` Supabase, `.env.local`
vars), scripts table, known gaps (pending `keyvisual.png`), docs pointers. Verified against
`app/login/page.tsx`, `app/todo/page.tsx`, `app/page.tsx`, `proxy.ts`, `lib/supabase/*.ts`,
`package.json`, `playwright.config.ts`, `.gitignore`, and the sealed reviewer/tester reports.

## docs/vi/generated/screen-list.md — NO CHANGE NEEDED
SCR001_Login / SCR002_Todo route, description, and states re-verified against
`app/login/page.tsx` / `app/todo/page.tsx` / `app/page.tsx` — still accurate (3 mapped files, within
the surgical-edit threshold; nothing to fix).

## docs/vi/generated/feature-list.md — NO CHANGE NEEDED
F001/F002 rows, related routes (`GET /auth/callback`, external GoTrue authorize, `setLocale` Server
Action), screens, and `status: implemented` re-verified against source — still accurate.

## docs/vi/system/permissions.md — SKIPPED, advisory
Maps to 5 changed source files (proxy.ts, app/auth/callback/route.ts, lib/supabase/server.ts,
lib/supabase/proxy-client.ts, app/todo/actions.ts) > 3-file escalation threshold. Also
forward-authored (Capability A) — reconciliation to as-built is the rebuild-spec Core pass's job,
not a per-task surgical patch. Stale content found: body still says "forward-draft, chưa có code"
despite frontmatter `status: implemented`.
→ Run `/tkm:rebuild-spec --artifact permissions`

## docs/vi/system/architecture.md — SKIPPED, advisory
Maps to 8 changed source files (lib/supabase/{client,server,proxy-client,next-path}.ts,
i18n/request.ts, next.config.ts, app/layout.tsx, proxy.ts) > 3-file threshold; same
forward-authored/Core-pass reasoning. Stale content: "forward-draft, chưa có code", and wrong paths
(`utils/supabase/*` should be `lib/supabase/*`, `src/i18n/request.ts` should be `i18n/request.ts`).
→ Run `/tkm:rebuild-spec --artifact architecture`

## Other general docs — not scaffolded
`docs/project-overview-pdr.md`, `codebase-summary.md`, `code-standards.md`, `system-architecture.md`,
`project-roadmap.md`, `deployment-guide.md`, `design-guidelines.md` do not exist in this project;
none warranted by this task — README + the layered specs already cover it. Left uncreated per task
guidance.

## Out of scope (read-only context, not touched)
`docs/vi/features/F001_GoogleOAuthLogin/*`, `docs/vi/features/F002_LanguageSwitch/*`,
`docs/vi/screens/SCR00*/spec.md`.

Memory saved: doc layout (`docs/vi/` root), forward-authored system-doc reconciliation note, pending
`keyvisual.png` asset — under `.claude/agent-memory/doc-writer/`.

**Status:** DONE
**Summary:** Updated README.md (was create-next-app boilerplate) | verified screen-list.md and
feature-list.md accurate, no changes needed | skipped architecture.md and permissions.md
(>3 changed files each, forward-authored docs reconciled only by rebuild-spec Core pass) with
advisories `/tkm:rebuild-spec --artifact architecture` and `/tkm:rebuild-spec --artifact permissions`
| did not scaffold other general docs (none existed, none warranted by this task's scope).
**Concerns/Blockers:** architecture.md and permissions.md still read "forward-draft, chưa có code"
and cite stale paths despite `status: implemented` — real drift that needs the rebuild-spec Core
pass; non-blocking for this task but should not be left indefinitely.
