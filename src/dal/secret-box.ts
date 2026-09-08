import "server-only";

/**
 * Server-side wrapper around `.rpc("open_secret_box")` (F000_SecretBoxModal,
 * migration `0011`) — this repo's FIRST `.rpc()` call. The Postgres
 * function resolves identity from `auth.uid()` itself; this DAL takes no
 * user id and passes none (FR-601).
 *
 * `RETURNS TABLE(badge_key text, unopened int)` means `.rpc()` resolves to
 * an ARRAY of one row through PostgREST, not a bare object — see
 * `0011_secret_box.sql`'s header comment. No Supabase types are generated
 * anywhere in this repo (`createClient()` carries no `Database` generic),
 * so nothing at compile time catches a caller that assumes the wrong
 * shape. `parseOpeningRow` below is that check, and it is load-bearing,
 * not defensive filler: an unrecognized shape THROWS (fail CLOSED) rather
 * than returning a guessed badge.
 *
 * The 6 badge keys are redeclared here rather than imported from
 * `(public)/kudos/_utils/secret-box-badge-asset.ts`: that file lives
 * inside a route's private folder, and `src/dal` is a shared layer routes
 * depend on, never the reverse (see
 * `nextjs-route-colocation-architecture`) — the same sideways-import
 * concern that file's own header already raises about `standards-copy.ts`.
 * Source of truth for the 6 values is `secret_box_openings.badge_key`'s
 * `CHECK` constraint in migration `0011`.
 */

export const SECRET_BOX_BADGE_KEYS = [
  "stay-gold",
  "flow-to-horizon",
  "touch-of-light",
  "beyond-the-boundary",
  "revival",
  "root-further",
] as const;

export type SecretBoxBadgeKey = (typeof SECRET_BOX_BADGE_KEYS)[number];

function isSecretBoxBadgeKey(value: unknown): value is SecretBoxBadgeKey {
  return (
    typeof value === "string" &&
    (SECRET_BOX_BADGE_KEYS as readonly string[]).includes(value)
  );
}

/**
 * `openSecretBox`'s own result union. Deliberately narrower than the
 * server action's `OpenSecretBoxResult` (which adds an `"unknown"` reason)
 * — this function only ever returns the two outcomes the RPC's own
 * `RAISE EXCEPTION`s name; every other failure (malformed response shape,
 * an unrecognized Postgres error, a thrown exception) propagates as a
 * thrown error for the caller to map, never silently downgraded to a
 * typed `ok:false` here.
 */
export type OpenSecretBoxOutcome =
  | { ok: true; badgeKey: SecretBoxBadgeKey; unopened: number }
  | { ok: false; reason: "no_boxes_left" | "unauthenticated" };

/**
 * The minimal slice of a Supabase (or Supabase-shaped) client this helper
 * touches — `.rpc("open_secret_box")`, no arguments. Deliberately narrower
 * than `SupabaseClient` so a caller (and this file's own test) can stub it
 * without matching the full SDK surface.
 */
export type SecretBoxClient = {
  rpc: (
    fn: "open_secret_box",
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};

/** Exact exception messages `0011_secret_box.sql`'s `open_secret_box()` raises. */
const NO_BOXES_LEFT_MESSAGE = "no_boxes_left";
const UNAUTHENTICATED_MESSAGE = "unauthenticated";

/**
 * Calls `open_secret_box()` for the session the injected client carries.
 * Maps the RPC's two known raised errors to a typed `ok:false` result;
 * anything else — an unrecognized Postgres error, or a malformed response
 * shape — throws (fail CLOSED). Never invented: no badge is ever returned
 * unless the response shape checks out completely.
 */
export async function openSecretBox(
  client: SecretBoxClient,
): Promise<OpenSecretBoxOutcome> {
  const { data, error } = await client.rpc("open_secret_box");

  if (error) {
    const message = extractErrorMessage(error);
    if (message === NO_BOXES_LEFT_MESSAGE) {
      return { ok: false, reason: "no_boxes_left" };
    }
    if (message === UNAUTHENTICATED_MESSAGE) {
      return { ok: false, reason: "unauthenticated" };
    }
    throw error instanceof Error
      ? error
      : new Error(`open_secret_box: ${message ?? "unrecognized RPC error"}`);
  }

  const { badgeKey, unopened } = parseOpeningRow(data);
  return { ok: true, badgeKey, unopened };
}

function extractErrorMessage(error: unknown): string | undefined {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return undefined;
}

/**
 * Boundary check for `.rpc("open_secret_box")`'s success response. Accepts
 * both the real shape (`[{ badge_key, unopened }]`, an array of one row)
 * and a bare object, in case a future PostgREST version changes how
 * `RETURNS TABLE` is surfaced — but rejects an empty array, a non-object
 * row, an unrecognized `badge_key`, or a non-integer/negative `unopened`
 * by throwing rather than guessing.
 */
function parseOpeningRow(data: unknown): {
  badgeKey: SecretBoxBadgeKey;
  unopened: number;
} {
  // `Array.isArray` narrows `data` to `any[]` at the type level (no
  // `Database` generic anywhere in this repo to inform a stricter element
  // type) — the explicit `unknown` annotation stops that `any` from
  // leaking into `row` and everything derived from it below.
  const row: unknown = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== "object") {
    throw new Error("open_secret_box: empty or non-object response");
  }

  const badgeKey: unknown = (row as Record<string, unknown>).badge_key;
  const unopened: unknown = (row as Record<string, unknown>).unopened;

  if (!isSecretBoxBadgeKey(badgeKey)) {
    throw new Error(
      `open_secret_box: unrecognized badge_key ${String(badgeKey)}`,
    );
  }
  if (
    typeof unopened !== "number" ||
    !Number.isInteger(unopened) ||
    unopened < 0
  ) {
    throw new Error(
      `open_secret_box: invalid unopened value ${String(unopened)}`,
    );
  }

  return { badgeKey, unopened };
}
