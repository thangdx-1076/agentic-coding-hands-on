import { http, HttpResponse } from "msw";

/**
 * The ONE shared MSW handler module. Both runtimes import from here:
 *  - Node (vitest)  → `mocks/node.ts` feeds these to `setupServer`
 *  - Browser (Storybook) → `.storybook/preview.tsx` feeds these to the worker
 *
 * Never define a second handler for the same endpoint somewhere else — a
 * change here must be visible to tests and stories at the same time.
 */

/**
 * Read at module scope so vitest's `test.env` and Storybook's build-time env
 * both land. Falls back to the local Supabase default so a story opened
 * without env still matches its own handlers rather than silently missing.
 */
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

/** A signed-in user, shaped like Supabase's `auth.users` row. */
export const MOCK_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "demo@example.com",
  aud: "authenticated",
  role: "authenticated",
};

/**
 * `/auth/v1/authorize` is deliberately absent.
 *
 * `signInWithOAuth` causes a top-level browser navigation, not a fetch/XHR.
 * MSW intercepts fetch/XHR/WebSocket — it cannot see a navigation, so a
 * handler for that path would never fire and would be dead code. Stories
 * simulate the login click through the `onLoginClick` prop instead.
 *
 * Everything below IS interceptable: each one is called server-side by
 * `@supabase/ssr` (Route Handler, Server Component, or Server Action).
 */
export const handlers = [
  // PKCE code -> session exchange (`exchangeCodeForSession`, /auth/callback).
  http.post(`${SUPABASE_URL}/auth/v1/token`, () =>
    HttpResponse.json({
      access_token: "mock-access-token",
      refresh_token: "mock-refresh-token",
      token_type: "bearer",
      expires_in: 3600,
      user: MOCK_USER,
    }),
  ),

  // Authoritative session check (`getUser`) used by every route guard.
  http.get(`${SUPABASE_URL}/auth/v1/user`, () => HttpResponse.json(MOCK_USER)),

  // `signOut()` from the /todo logout Server Action.
  http.post(
    `${SUPABASE_URL}/auth/v1/logout`,
    () => new HttpResponse(null, { status: 204 }),
  ),
];
