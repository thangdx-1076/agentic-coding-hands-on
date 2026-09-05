---
authored_by: researcher
---
# React 19 hooks under vitest + honest 100% coverage gate

Skill preflight: `tkm:help` → `tkm:research` → `tkm:search-docs` activated per rules.

**Method.** context7 404'd for `vitest` and `testing-library/react` (consistent with prior memory: this
`fetch-docs.js` backend regularly 404s for well-known libs) → fell back to WebFetch on official docs +
WebSearch cross-validation, PLUS an empirical scratch project
(`/private/tmp/.../scratchpad/vprobe`) pinned to this repo's **exact** versions (vitest 3.2.7,
`@testing-library/react` 16.3.3, react 19.2.8, jsdom). 6 separate probe runs, all green (or
red→green for the threshold check) — every code shape below actually executed, not just "should
work per docs." Read: `vitest.config.ts`, both hook files, all 3 Supabase factories, `next-path.ts`,
`app/actions/locale.ts`, `app/todo/actions.ts`, `app/auth/callback/route.ts`, all 3 `page.tsx`,
`login-client.tsx`, `eslint.config.mjs`, `package.json`, `tsconfig.json`, all 5 existing
`lib/**/*.test.ts`, plus project history (phase-04 plan, latest journal, test-coverage-audit report,
`architecture.md` § Test topology).

**Baseline reconfirmed** via `pnpm test:unit:coverage`: 64.1% stmts / 92.45% branch / 78.57% funcs —
matches brief exactly. `lib/supabase/{client,server,proxy-client}.ts` = 0%, `next-path.ts` 96.42%
(lines 79-80 = `hasEncodedForbiddenChar`'s `catch`).

---

## Q1 — DOM environment: jsdom vs happy-dom

**Recommend jsdom.**

| | jsdom | happy-dom |
|---|---|---|
| Spec compliance | High — "safe choice when reliability matters more than speed" (3 independent sources agree) | Lower by design — "implements the common path, sacrifices edge-case compliance for speed" |
| Speed | Baseline | 2-4x faster |
| This repo's need | `document.addEventListener`, `.focus()`, keyboard events, `document.activeElement` — exactly the edge-case territory happy-dom trims | — |
| Scale here | 2 hook files, ~10-15 cases | — |

At this scale happy-dom's speed edge is noise; jsdom's fidelity is what avoids false
positives/negatives on focus/event semantics. Next.js's own official vitest guide (fetched live,
`version: 16.3.4` / `lastUpdated: 2026-08-25` — matches this repo's exact pin) installs `jsdom`, not
happy-dom.

**Packages** (npm registry `latest` + empirically run together):
- `jsdom@^30.0.1`
- `@testing-library/react@^16.3.3` — peers: `react`/`react-dom` `^18||^19`, `@testing-library/dom@^10.0.0`
- `@testing-library/dom@^10.4.1` — **required explicit install**: RTL v16.0.0 moved this to a real
  `peerDependency` (breaking change, confirmed via GitHub releases), no longer bundled transitively.

**React 19 special needs: none beyond the packages above.**
- `IS_REACT_ACT_ENVIRONMENT`: **not needed manually.** `@testing-library/react` sets it as an
  import side-effect — confirmed empirically (zero act-environment warnings across 6 probe runs,
  zero manual setup). Do not add a `setupFiles` line for this (YAGNI).
- `@vitejs/plugin-react`: **not needed.** Confirmed empirically — vitest ran `.ts`/`.tsx` fine with
  zero Vite plugins (matches current `vitest.config.ts`, which has none). Neither hook test calls
  `render()`/writes JSX: `renderHook` takes a plain callback; DOM wiring uses raw
  `document.createElement` + ref-callback calls + `fireEvent`. Add this plugin only if a future test
  renders real JSX (e.g. `components/**` — explicitly out of scope here).
- `@testing-library/jest-dom`: skip (YAGNI) — no `render()`+DOM-tree assertions here, only
  `result.current` values and `document.activeElement`.

Adoption risk: jsdom major-bumped recently (confirmed 30.0.1 installs/runs clean here); RTL's one
breaking peer-dep change (v16.0.0) is already priced into the install command above.

---

## Q2 — Hook testing API: renderHook + act + useTransition

Confirmed empirically. Exact shape for `use-login-actions.ts`:

```ts
// @vitest-environment jsdom   (or via a "projects" jsdom project — see Q3)
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useLoginActions } from "./use-login-actions";
import { signInWithGoogle } from "@/lib/auth/sign-in-with-google";

vi.mock("@/lib/auth/sign-in-with-google", () => ({ signInWithGoogle: vi.fn() }));

describe("useLoginActions", () => {
  it("isPending true ngay khi bấm, false sau khi promise resolve; !ok bật hasClientError", async () => {
    let resolveSignIn!: (v: { ok: boolean }) => void;
    vi.mocked(signInWithGoogle).mockReturnValueOnce(
      new Promise((res) => { resolveSignIn = res; }),
    );

    const { result } = renderHook(() => useLoginActions({ next: "/todo" }));
    expect(result.current.isPending).toBe(false);

    act(() => { result.current.handleLoginClick(); });
    // isPending flips true SYNCHRONOUSLY at the startTransition call —
    // no await needed to observe this (react.dev/reference/react/useTransition, verbatim).
    expect(result.current.isPending).toBe(true);

    await act(async () => {
      resolveSignIn({ ok: false });
      await Promise.resolve(); // drain microtask so the state update commits
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.hasClientError).toBe(true);
  });
});
```

Facts behind this (each independently confirmed):
- `isPending` → `true` **synchronously** at `startTransition` — verbatim from react.dev's
  `useTransition` page: "the `isPending` state switches to `true` at the first call to
  `startTransition`."
- `await act(async () => {...})` is React's own recommended pattern over sync `act()` —
  react.dev's `act` page: "it's difficult to predict when you can use the sync version."
- `result.current` is a ref-like snapshot of the latest **committed** value
  (testing-library.com docs).
- **Footgun found in several search results**: `waitForNextUpdate()` is from the deprecated,
  merged-away `@testing-library/react-hooks` package — does **not** exist on current
  `renderHook`. Use `waitFor` (top-level export of `@testing-library/react`) instead.

`handleSelectLocale` shares the SAME transition (intentional — per the hook's own doc comment).
Regression-guard test, preserve this behavior, don't "fix" it:
```ts
it("chọn ngôn ngữ dùng chung transition với login — isPending cũng true", () => {
  vi.mocked(setLocale).mockReturnValueOnce(new Promise(() => {})); // never resolves
  const { result } = renderHook(() => useLoginActions({ next: "/todo" }));
  act(() => { result.current.handleSelectLocale("en"); });
  expect(result.current.isPending).toBe(true);
});
```

---

## Q3 — multi-environment vitest config

| Option | Status at vitest 3.2.7 (repo's pin) | Verdict |
|---|---|---|
| `environmentMatchGlobs` | Exists but **deprecated since v3** — confirmed on the version-pinned `v3.vitest.dev` docs (NOT the "latest" docs site, which already serves v5) | Reject |
| per-file `// @vitest-environment jsdom` | Works, confirmed empirically | Viable but doesn't scale, and can't vary other test-block options per group |
| `projects` (renamed from `workspace` at 3.2 — repo is 3.2.7, past the rename) | Stable, confirmed via version-pinned docs AND empirically (6 green runs mixing node+jsdom in ONE `vitest run`, one coverage report, one exit code) | **Recommended** |

```ts
test: {
  projects: [
    {
      extends: true,
      test: { name: "node", environment: "node", include: ["lib/**/*.test.ts", "app/**/*.test.ts"] },
    },
    {
      extends: true,
      test: { name: "jsdom", environment: "jsdom", include: ["hooks/**/*.test.ts"] },
    },
  ],
},
```
`extends: true` (default) inherits root `resolve.alias` and `coverage`. Empirically confirmed the
`@/` alias **survives** the split (this repo's own config comment already flags a prior
alias-resolution bug — re-verified it does not recur under `projects`). `coverage`/`reporters` only
work at root per docs — fine, since one unified number across both environments is exactly the
goal (confirmed empirically: v8 coverage aggregates `hooks/**` + `lib/**` + `app/**` into one table,
one threshold check, one exit code). Docblocks still work layered on top of `projects` if ever
needed for a one-off exception — not needed here, the split is already clean by directory.

---

## Q4 — 100% coverage gate: what belongs in scope

| Path | Testable under vitest? | Why / how |
|---|---|---|
| `lib/**/*.ts` | Yes | Already covered |
| `lib/supabase/{client,server,proxy-client}.ts` | **Yes** | Mock `@supabase/ssr` exports (+`next/headers` for server.ts). Thin factories — assert correct args + cookie-adapter wiring. See Q5(b). |
| `hooks/**/*.ts` | Yes | Target of this report |
| `app/actions/locale.ts` | **Yes** | Mock `next/headers`. **Currently zero coverage anywhere** — the latest journal explicitly lists "E2E does not assert cookie-write/re-render of language switch" as still open. This closes a real, already-acknowledged gap, not a duplicate. |
| `app/todo/actions.ts` (`logoutAction`) | **Yes** | Mock `@/lib/supabase/server` + `next/navigation`. A real E2E logout test exists (phase-04) but is tagged `@auth`, local-Supabase-only, and **CI runs `--grep-invert @auth`** (confirmed in `architecture.md` § Test topology + the ci.yml description in the coverage-audit report) — CI itself never executes this action today. A mocked unit test is the only CI-enforced guard. Complementary layer, not DRY-violating duplication. |
| `app/auth/callback/route.ts` | **Yes, lower confidence** | `GET` takes a plain `Request`, returns `NextResponse.redirect(...)` — a plain response object, **not** the throwing `redirect()` from `next/navigation` (different API/module). Standard, stable Route Handler architecture, not something Next 16 changed — but I could **not** corroborate this against this repo's own bundled Next 16 docs: `node_modules/next/dist/docs/` (named in `AGENTS.md`) is blocked for both Read and Bash in this environment (confirmed, not assumed). Recommend implementer smoke-test before relying on it. E2E already covers the `?error=`/no-code branches (CI-safe, phase-04); the `?code=` success-exchange branch is a documented open gap regardless (phase-04's own Next Steps) — a unit test here duplicates nothing that currently exists. |
| `app/**/page.tsx` (all 3: `/`, `/login`, `/todo`) | **No — exclude, first-party reason** | Confirmed by direct read: all 3 are `async function` Server Components. Next.js's own official vitest guide (fetched live, version-matched 16.3.4) states verbatim: *"Since `async` Server Components are new to the React ecosystem, Vitest currently does not support them... we recommend using E2E tests."* Structurally unsupported, not a "later" item. Playwright already owns this (`architecture.md` § Test topology). |
| `components/**` | **No — exclude, product decision** | Ruled out for Storybook. Storybook isn't installed yet — that's an independent initiative; this gate doesn't wait on it. |
| `app/login/login-client.tsx` and any other `.tsx` | **No — exclude, and this is the repo's own recent intent** | Read directly: 48 lines, its own doc comment: *"Chỉ nối props với hành động... nằm trong `useLoginActions`"*. This file is thin **because of** the hook-extraction refactor on this very branch (`fe81490`) — the explicit point of that refactor was pulling testable behavior OUT of `.tsx` into `.ts`. Treat as settled intent. |

**Recommendation: allowlist, not denylist.**
```ts
coverage: {
  include: [
    "lib/**/*.ts",
    "hooks/**/*.ts",
    "app/actions/**/*.ts",
    "app/todo/actions.ts",
    "app/auth/callback/route.ts",
  ],
  exclude: ["**/*.test.ts"],
  thresholds: { 100: true },
}
```
No `.tsx` glob ever appears in `include` — removes the "how do I exclude components/pages"
enumeration problem entirely (extension mismatch does it for free), and matches this repo's own
established practice (current config's comment: *"An explicit include is what makes the percentage
mean something"*). `{100: true}` shorthand confirmed to exist at 3.2.7 (version-pinned docs) AND
confirmed empirically to **fail the process** (exit 1) when any included file/branch is under
100% — a real CI gate, not a printed number.

**What "100%" will honestly mean:** every pure helper, every hook's observable state machine (incl.
DOM wiring), and every Server Action/Route Handler's own logic (Next.js/Supabase boundary mocked)
is exercised by fast, deterministic tests. It will **not** mean Server Components render correctly,
real Supabase/Google OAuth works, or the UI looks right — Playwright and (eventually) Storybook own
those, unchanged.

**This supersedes phase-04's own prior decision**, not contradicts it. Phase 04 chose "no
thresholds" because at the time only 2 pure-logic files ran under vitest and "a percentage here is
cosmetic, not signal" (`phase-04-test-gaps-and-coverage-tooling.md` § Key Insights, verbatim). That
was correct for that scope. This recommendation is what changes once the scope is honestly redrawn
(above). If `include` ever silently grows to swallow `.tsx`/Server Components again, phase-04's
original objection becomes true again — the allowlist is the guardrail against that regression.

---

## Q5 — reaching 100% on the known gaps

**(a) `next-path.ts:79-80`.** Need a percent-encoded byte that is (1) not itself a forbidden ASCII
control code point, so the ASCII-control pass doesn't short-circuit first, and (2) still makes
`decodeURIComponent` throw. Confirmed by direct Node execution: `decodeURIComponent("%80")` →
`URIError: URI malformed` (0x80 is outside the forbidden set: not `<0x20`, not `0x7f`).
```ts
it("chấp nhận path khi phần percent-encoded không decode được (không phải control char)", () => {
  expect(safeNextPath("/todo%80", "/todo")).toBe("/todo%80");
});
```
Lands exactly in the `catch { return false; }`; result is ACCEPT (not reject) — an
undecodable-but-non-control byte isn't a proven attack, so the function conservatively falls
through. Correct behavior, not a bug.

**(b) three Supabase factories** — shapes derived from the real source (not guessed):
```ts
// client.ts
vi.mock("@supabase/ssr", () => ({ createBrowserClient: vi.fn() }));
// assert createClient() → createBrowserClient(url, publishableKey), exactly 2 args.

// server.ts (async; needs next/headers too)
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

it("delegates getAll, swallows setAll() throw (read-only Server Component ctx)", async () => {
  const getAll = vi.fn().mockReturnValue([{ name: "a", value: "b" }]);
  const set = vi.fn(() => { throw new Error("readonly"); });
  vi.mocked(cookies).mockResolvedValueOnce({ getAll, set });

  await createClient();
  const cookieConfig = vi.mocked(createServerClient).mock.calls[0][2].cookies;

  expect(cookieConfig.getAll()).toEqual([{ name: "a", value: "b" }]);
  expect(() => cookieConfig.setAll([{ name: "x", value: "y", options: {} }])).not.toThrow();
});

// proxy-client.ts (fake request/response, .cookies.getAll/set)
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));

it("ghi cookie lên CẢ request lẫn response", () => {
  const request = { cookies: { getAll: vi.fn(() => []), set: vi.fn() } };
  const response = { cookies: { set: vi.fn() } };
  createProxyClient(request as never, response as never);

  const { setAll } = vi.mocked(createServerClient).mock.calls[0][2].cookies;
  setAll([{ name: "sb", value: "v", options: { path: "/" } }]);

  expect(request.cookies.set).toHaveBeenCalledWith("sb", "v");
  expect(response.cookies.set).toHaveBeenCalledWith("sb", "v", { path: "/" });
});
```

**(c) `use-login-actions.ts` `useTransition` branches incl. `!ok`** — see Q2's full example (pending
timing + `!ok`→`hasClientError`); add the `ok:true` mirror (no `setHasClientError(true)` call) and
the `handleSelectLocale` shared-transition assertion.

**(d) `use-menu-keyboard-nav.ts`** — two DIFFERENT techniques for two different mechanisms, both
confirmed empirically necessary:
- **Outside-click + focus-effect** (`useEffect` + `document.addEventListener` + `.focus()`): real
  DOM. `document.createElement`, wire via `registerRoot`/`registerItem(i)` inside `act()`, open the
  menu, assert `document.activeElement`, then `fireEvent.mouseDown(document.body)`
  (`@testing-library/dom`) to hit the real listener and assert `open` flips false.
- **ArrowDown/Up/Home/End/Escape/Tab** (`handleButtonKeyDown`/`handleMenuKeyDown`): plain returned
  functions, not DOM listeners — call directly with a minimal hand-built event object, no
  `fireEvent`/dispatch needed:
```ts
const key = (k: string) =>
  ({ key: k, preventDefault: vi.fn() }) as unknown as KeyboardEvent<HTMLDivElement>;
act(() => { result.current.handleMenuKeyDown(key("End")); });
expect(result.current.activeIndex).toBe(itemCount - 1);
```
Simpler than simulating a full JSX-wired keydown — don't over-build this (KISS).

---

## Q6 — Server Action + next/headers/next/navigation mocking

Both shapes confirmed via an empirical scratch run (functionally-equivalent stand-in modules — the
real repo already depends on `next`, so this is a non-issue there; `vi.mock`'s factory fully
replaces the specifier regardless).

`next/headers` (async in Next 16 — confirmed by direct source read, `await cookies()` in both
`server.ts` and `locale.ts`):
```ts
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

// happy path
vi.mocked(cookies).mockResolvedValueOnce({ set: vi.fn() });

// throw path — exercises setLocale's catch → wrapped rethrow
const set = vi.fn(() => { throw new Error("Cookies can only be modified in a Server Action"); });
vi.mocked(cookies).mockResolvedValueOnce({ set });
await expect(setLocale("vi")).rejects.toThrow(/failed to persist NEXT_LOCALE cookie/);
```

`next/navigation` `redirect()` — **it throws internally to unwind the render; the mock must too**,
or a test asserting "code after redirect() doesn't run" gives a false pass:
```ts
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => { throw new Error("NEXT_REDIRECT"); }),
}));

it("vẫn redirect /login dù signOut() reject", async () => {
  const signOut = vi.fn().mockRejectedValueOnce(new Error("expired"));
  await expect(logoutAction(signOut)).rejects.toThrow("NEXT_REDIRECT");
  expect(redirect).toHaveBeenCalledExactlyOnceWith("/login");
});
```
General caution (not a bug found here): never let a local `try/catch` wrap the `redirect()` call
itself — it would swallow the throw and silently break the real redirect. This repo's actual
`logoutAction` already keeps `redirect("/login")` OUTSIDE its try/catch — correctly structured
today.

---

## Q7 — MSW (note only — another agent owns the detail)

`setupServer` from `msw/node` lifecycle (mswjs.io docs): `beforeAll(() => server.listen())`,
`afterEach(() => server.resetHandlers())`, `afterAll(() => server.close())`, wired via vitest's
`test.setupFiles`. No conflict with the jsdom/node environment choice: MSW's node integration
patches Node's `http`/`https` (and global `fetch`) at the process level, below whatever DOM shim
supplies globals — environment-agnostic by construction. Flag for that agent: if `setupFiles` is
set at ROOT (not per-project), it runs for both the `node` and `jsdom` projects equally — confirm
that's desired before wiring it in.

---

## Install command
```bash
pnpm add -D @testing-library/react@^16.3.3 @testing-library/dom@^10.4.1 jsdom@^30.0.1
```
(`vitest`/`@vitest/coverage-v8` stay `^3.2.7` — no change; both must share the same major.minor.)

## Full proposed vitest.config.ts
```ts
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Two runners in one config via `projects` (stable since 3.2 — this repo
 * pins 3.2.7, past the rename from `workspace`; `environmentMatchGlobs` is
 * deprecated as of v3, so not used here):
 *  - `node`  — pure-logic helpers (`lib/**`) and Server Actions/Route
 *    Handlers (`app/**`) that only need their Next.js/Supabase boundary
 *    mocked, never a DOM.
 *  - `jsdom` — hooks (`hooks/**`) that touch `document`/focus/keyboard.
 * `coverage` and `resolve.alias` live at ROOT (vitest requires this) and
 * are inherited by both projects (`extends: true`, the default) —
 * verified empirically that the `@/` alias survives the split (this repo
 * hit an alias-resolution bug once before switching to an explicit
 * `coverage.include`; re-verified it does not recur here).
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "jsdom",
          environment: "jsdom",
          include: ["hooks/**/*.test.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "coverage",
      // Explicit allowlist, not "everything except X" — this is what
      // keeps 100% honest. Every entry here is testable-under-vitest by
      // mocking its Next.js/Supabase boundary; nothing async-Server-
      // Component or presentational (.tsx) ever appears, by construction
      // (glob extension mismatch, not a maintained exclude list). See
      // researcher-260905-2221-vitest-hooks-coverage.md § Q4 for the
      // per-path why/why-not table.
      include: [
        "lib/**/*.ts",
        "hooks/**/*.ts",
        "app/actions/**/*.ts",
        "app/todo/actions.ts",
        "app/auth/callback/route.ts",
      ],
      exclude: ["**/*.test.ts"],
      thresholds: { 100: true },
    },
  },
});
```

## ESLint follow-up (one line)
`eslint.config.mjs`'s vitest block currently scopes to `lib/**/*.test.ts` only — widen it:
```diff
- files: ["lib/**/*.test.ts"],
+ files: ["lib/**/*.test.ts", "hooks/**/*.test.ts", "app/**/*.test.ts"],
```

---

## Unresolved
1. `NextResponse.redirect()` request-context-independence (Q4/route.ts) — inferred from stable
   Next.js Route Handler architecture, **not verified** against this repo's bundled Next 16 docs
   (`node_modules/next/dist/docs/`, blocked for both Read and Bash in this environment). Smoke-test
   before committing to that test shape.
2. Whether phase-04's 45-minute PKCE timebox for `/auth/callback`'s `?code=` success branch
   succeeded at E2E is not confirmed from available evidence — either way a unit test there is
   non-duplicative, but worth a quick check so the two don't silently diverge in what they assert.
3. MSW `setupFiles` scope (root vs per-project) — flagged for the MSW-focused agent, not answered
   here.
4. Storybook's actual arrival is out of scope — the coverage-gate recommendation above doesn't
   depend on it.

**Status:** DONE
**Summary:** jsdom (not happy-dom) + `@testing-library/react` v16.3.3 + vitest `projects`
(node/jsdom split) give an honest, empirically-verified 100% gate scoped to `lib/**`, `hooks/**`,
and the 3 mockable Server Action/Route Handler files — excluding async Server Components (Next's
own docs: unsupported) and all `.tsx` (components → Storybook, already this branch's own
hook-extraction intent). Every config/test shape above actually ran green (or red→green for the
threshold check) in a scratch project pinned to this repo's exact versions, not sourced from docs
alone.
