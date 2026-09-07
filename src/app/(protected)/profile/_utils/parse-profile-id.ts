/**
 * The only input-validation gate on `/profile`'s `?id=` query param — every
 * value that reaches `getProfileCard` (`src/dal/profile-cards.ts`) has
 * already passed through here (FR-402…FR-406, clarifications.md D003-D006).
 *
 * Pure and synchronous by design: it decides, it never executes the
 * decision. `page.tsx` (phase 07) owns turning a `ProfileIdResolution` into
 * `redirect()` / `notFound()` / a DAL call — keeping the decision here lets
 * it be unit-tested at 100% without mocking `next/navigation` or Supabase.
 *
 * Branch order is intentional, not incidental:
 *   1. absent/empty  → self       (a cleared query string is not an error)
 *   2. non-string     → reject     (Next yields `string[]` for a repeated key —
 *                                   never silently pick `[0]`)
 *   3. shape mismatch → reject     (BEFORE any query: a non-UUID string sent to
 *                                   a `uuid` column raises Postgres `22P02`,
 *                                   which would otherwise surface as a 500
 *                                   instead of a 404)
 *   4. equals viewer  → canonical  (copying your own profile link renders the
 *                                   SELF view, not the "other" branch)
 *   5. else           → other     (a valid UUID with no matching row is a DB
 *                                   miss the caller turns into 404 — that is
 *                                   NOT this function's job to detect)
 * Reordering step 4 above step 3 would compare an unvalidated string against
 * `viewerId` — never use a value before its shape is checked.
 */

// Anchored both ends (`^…$`) so `"xxx<uuid>yyy"` cannot slip through, and
// deliberately WITHOUT the `g` flag: a module-scope regex with `g` makes
// `.test()` stateful via `lastIndex`, producing alternating true/false
// results across calls — here that would mean random 404s.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ProfileIdResolution =
  | { kind: "self" }
  | { kind: "canonical" }
  | { kind: "other"; id: string }
  | { kind: "reject" };

export function parseProfileId(
  rawId: string | string[] | undefined,
  viewerId: string,
): ProfileIdResolution {
  if (rawId === undefined || rawId === "") {
    return { kind: "self" };
  }

  if (typeof rawId !== "string") {
    return { kind: "reject" };
  }

  if (!UUID_RE.test(rawId)) {
    return { kind: "reject" };
  }

  const normalizedId = rawId.toLowerCase();
  if (normalizedId === viewerId.toLowerCase()) {
    return { kind: "canonical" };
  }

  return { kind: "other", id: normalizedId };
}
