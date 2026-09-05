## Background Logic Source Inventory

<!-- Stack not in bl-source-patterns.md table (no Next.js App Router row — closest
     analog rows are NestJS/FastAPI, both Mode B annotation-based, which doesn't fit
     Next.js's file-convention model). Applying [SIGNAL_INFERRED] protocol per file
     wherever a canonical BL intent is matched; all empty categories still emit the
     `_(none found)_` sentinel per contract. UNCHANGED vs baseline scout — re-verified
     all three integration files' source content byte-for-byte against the prior
     scout's description; no new BL-shaped file was introduced by the toolchain change. -->

### Next.js (JS/TS)

- custom-command: _(none found)_
- event-listener: _(none found)_
- integration: lib/supabase/client.ts [SIGNAL_INFERRED]
  - Intent matched: integration — external API/service client (Supabase Auth/DB SDK)
  - No-row reason: stack=Next.js App Router, no row in bl-source-patterns.md table (closest analog, NestJS's "external SDK injection clients," is a Mode B annotation pattern that doesn't apply here — this is a plain factory function)
  - Observed pattern: exports `createClient()` wrapping `createBrowserClient` from `@supabase/ssr`, the browser-side Supabase SDK entry point used by client components
- integration: lib/supabase/proxy-client.ts [SIGNAL_INFERRED]
  - Intent matched: integration — external API/service client (Supabase Auth SDK for the proxy layer)
  - No-row reason: same as above — Next.js has no table row; NestJS integration analog doesn't structurally match
  - Observed pattern: exports `createProxyClient(request, response)` wrapping `createServerClient` from `@supabase/ssr`, dual-writing cookies to request+response per the documented proxy pattern
- integration: lib/supabase/server.ts [SIGNAL_INFERRED]
  - Intent matched: integration — external API/service client (Supabase Auth SDK for Server Components/Actions/Route Handlers)
  - No-row reason: same as above
  - Observed pattern: exports `async createClient()` wrapping `createServerClient` from `@supabase/ssr`, cookie-store-backed
- mail: _(none found)_
- middleware: _(none found)_
  <!-- proxy.ts implements the Next.js "proxy" (formerly middleware) layer, but its
       sole job is the auth guard + locale-cookie normalization — Auth/permission
       middleware is explicitly excluded from this category per bl-source-patterns.md
       (see File Inventory: proxy.ts tagged `permission`, not BL middleware). -->
- notification: _(none found)_
- observer: _(none found)_
- queue-worker: _(none found)_
- scheduled-job: _(none found)_
- webhook: _(none found)_
  <!-- app/auth/callback/route.ts is Supabase's OAuth PKCE redirect-callback
       consumer (an inbound browser redirect carrying `?code`/`?error`), not an
       inbound/outbound webhook (no server-to-server async event push). Already
       captured in File Inventory as `route`. -->

**Confirmed unchanged vs baseline**: 3 integration entries, 9 empty categories — same as the
260905-1447 scout. No CI/ESLint/coverage/pnpm change added or removed a BL-shaped file.

