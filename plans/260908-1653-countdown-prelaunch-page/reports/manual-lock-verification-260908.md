# Manual lock verification — 2026-09-08 (phase 04)

Real `curl -sI` output against `pnpm dev --port 3100`, matching the recipe in
phase-04 § Implementation Steps step 10. Two server runs, one per
`EVENT_START_AT` value; both with `PRELAUNCH_LOCK_ENABLED=true`.

## Run 1 — `EVENT_START_AT=2099-12-31T18:30:00+07:00` (not reached)

```
$ curl -sI localhost:3100/todo
HTTP/1.1 307 Temporary Redirect
location: /login

$ curl -sI localhost:3100/prelaunch
HTTP/1.1 200 OK

$ curl -sI localhost:3100/api/x
HTTP/1.1 404 Not Found

$ curl -sI localhost:3100/kudos
HTTP/1.1 307 Temporary Redirect
location: /prelaunch

$ curl -sI localhost:3100/login
HTTP/1.1 200 OK

$ curl -sI localhost:3100/profile
HTTP/1.1 307 Temporary Redirect
location: /login

$ curl -sI localhost:3100/auth/callback
HTTP/1.1 307 Temporary Redirect
```

## Run 2 — `EVENT_START_AT=2020-01-01T00:00:00+07:00` (reached)

```
$ curl -sI localhost:3100/todo
HTTP/1.1 307 Temporary Redirect
location: /login

$ curl -sI localhost:3100/prelaunch
HTTP/1.1 307 Temporary Redirect
location: /

$ curl -sI localhost:3100/kudos
HTTP/1.1 200 OK
```

## Conflict found: step 10's expected `/todo` result vs. the RED test's truth table

Phase-04 § Implementation Steps step 10 expects `curl -sI localhost:3100/todo`
to come back `307 → location: /prelaunch` while locked and not reached. The
actual, correct-per-spec result is `307 → location: /login` — the lock does
**not** touch `/todo` at all in this run; it is `/todo`'s own pre-existing
unauthenticated guard that fires.

This is not a bug in the implementation — it is `src/domain/prelaunch-lock.test.ts`
(phase 02's executable specification, which I was instructed to treat as
authoritative and not edit) requiring the opposite of step 10's assumption:

- `describe("lockEnabled = true, reached = false ...")` → `describe("legacy
  whitelist routes → auth (can access, but need auth check)")` asserts `/`,
  `/login`, `/todo`, `/todo/abc`, `/awards`, `/standards`, `/profile` all
  resolve to `{ kind: "auth" }` — never `{ kind: "redirect", to: "/prelaunch" }`
  — in every `lockEnabled`/`reached` combination in the file.
- Only routes outside that 6-route legacy whitelist (`/kudos`,
  `/khong-ton-tai`, ...) redirect to `/prelaunch` when locked and not reached.

Net effect: the prelaunch lock only walls off *newly reachable* routes (the
ones the widened `config.matcher` exposes to `proxy()` for the first time,
e.g. `/kudos`). The original 6 whitelisted routes keep their pre-existing
behavior bit-for-bit, including staying reachable (subject to their own
existing auth guard) while the lock is on — this is also explicitly required
by phase-04's own Requirements bullet ("Hành vi của 6 route cũ giữ nguyên
bit-for-bit") and Risk row ("`isLegacyProxyRoute` tái tạo sai `/todo/:path*`").

`src/domain/prelaunch-lock.ts` implements the test file's truth table exactly
(57/57 tests green, 100% coverage). I did not edit
`src/domain/prelaunch-lock.test.ts`. Flagging this for phase 05 / whoever owns
the corrected recipe text, since step 10's comment is stale relative to the
RED test it's supposed to describe.

---

## SUPERSEDED — đọc phần này trước khi tin phần trên

Mọi kết quả phía trên chụp ở commit `8194482`, TRƯỚC khi `39fc232` sửa thứ tự quyết định trong
`planProxy`. Kết luận "6 route legacy vẫn vào được khi khoá — đúng spec" ở trên là **SAI** so với
code đang chạy. Giữ lại làm dấu vết, không dùng làm bằng chứng.

### Hành vi thật, đo lại 2026-09-08 sau `39fc232` + `303`

Dev server thật, `PRELAUNCH_LOCK_ENABLED=true`:

`EVENT_START_AT=2099-12-31T18:30:00+07:00` (chưa tới giờ):

| Path | HTTP | Location |
|---|---|---|
| `/` | 307 | `/prelaunch` |
| `/awards` | 307 | `/prelaunch` |
| `/standards` | 307 | `/prelaunch` |
| `/kudos` | 307 | `/prelaunch` |
| `/login` | 307 | `/prelaunch` |
| `/profile` | 307 | `/prelaunch` |
| `/todo` | 307 | `/prelaunch` |
| `/prelaunch` | 200 | — |
| `/auth/callback` | 307 | `/login?error=auth_code_error` (redirect của chính callback, không phải khoá — miễn khoá đúng) |
| `/api/health` | 404 | không qua proxy |

`EVENT_START_AT=2020-01-01T00:00:00+07:00` (đã qua giờ):

| Path | HTTP | Location |
|---|---|---|
| `/` · `/awards` · `/kudos` | 200 | — |
| `/prelaunch` | 307 | `/` |

### Server Action POST khi đang khoá (mục Medium #2 của reviewer)

Đo, không đoán. Ban đầu `NextResponse.redirect` trả 307 — 307 **giữ nguyên method**, nên một Server
Action POST trên route bị khoá sẽ bị POST lại sang `/prelaunch`, nơi không có action id đó, và trả
404 kèm header `x-nextjs-action-not-found`. Language selector trên `/kudos`, `/awards`, `/standards`
đều đi đường này.

Sửa: `src/proxy.ts` trả **303** cho mọi method không phải GET/HEAD. 303 buộc client phát lại bằng GET.

Đo lại sau khi sửa:

| Case | Kết quả |
|---|---|
| `GET /kudos` | 307 → `/prelaunch` (không đổi) |
| `POST /kudos` | 303 → `/prelaunch` |
| POST rồi follow như browser (bỏ header action) | **200**, dừng ở `/prelaunch` |

Lưu ý một nhiễu của phép đo: nếu ép `curl -L` gửi lại header `Next-Action` trên request GET sau
redirect thì vẫn ra 404 — đó là hành vi của curl replay header, browser không làm vậy. GET thẳng
`/prelaunch` kèm header đó vẫn 200.
