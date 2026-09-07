"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/constants/routes";

/** Postgres `unique_violation` — https://www.postgresql.org/docs/current/errcodes-appendix.html */
const POSTGRES_UNIQUE_VIOLATION = "23505";

export type ToggleKudoHeartResult =
  | { ok: true; hearted: boolean; heartCount: number }
  | { ok: false; reason: "unauthenticated" | "error" };

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Toggles the current viewer's heart on one kudo (F008_KudosHeartReaction,
 * BR-001/BR-002/BR-003). Postgres, not this function, is the enforcement
 * point for every rule: `kudo_hearts`'s `UNIQUE(kudo_id, user_id)` (0007)
 * decides races between two rapid clicks, and its INSERT policy's
 * `WITH CHECK` rejects a sender hearting their own kudo even when this
 * action is invoked directly, bypassing a disabled button — this function
 * only reads the outcome back and never assumes it.
 *
 * Always re-derives the caller from the server session; a client-supplied
 * "currently hearted" flag is never trusted. Fails CLOSED — unlike the
 * board's read DALs — because a silent partial write here would corrupt
 * `kudos.heart_count`: any read/write error returns `{ok:false}` and
 * leaves no partial state behind.
 */
export async function toggleKudoHeart(
  kudoId: string,
): Promise<ToggleKudoHeartResult> {
  // Boundary check: a Server Action is a real HTTP endpoint once compiled —
  // this function's `string` parameter type does not survive a direct POST
  // that skips the generated client wrapper, so a non-string/empty value is
  // rejected here rather than reaching Postgres as a malformed query.
  if (typeof kudoId !== "string" || kudoId.trim() === "") {
    return { ok: false, reason: "error" };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, reason: "unauthenticated" };
    }

    const hearted = await applyToggle(supabase, kudoId, user.id);
    const heartCount = await readHeartCount(supabase, kudoId);

    revalidatePath(ROUTES.KUDOS);
    return { ok: true, hearted, heartCount };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/**
 * Flips the viewer's heart and returns the resulting `hearted` state.
 * Throws on any Postgres error OTHER than a `23505` unique-violation on
 * INSERT — two rapid clicks both read "no row" and both attempt an INSERT;
 * the loser hits `kudo_hearts`'s `UNIQUE(kudo_id, user_id)` instead of the
 * sender-guard. That one case re-reads the row instead of surfacing the
 * race as an error to the caller.
 */
async function applyToggle(
  supabase: SupabaseServerClient,
  kudoId: string,
  userId: string,
): Promise<boolean> {
  const existing = await selectHeartId(supabase, kudoId, userId);

  if (existing) {
    const { error } = await supabase
      .from("kudo_hearts")
      .delete()
      .eq("id", existing.id);
    if (error) {
      throw error;
    }
    return false;
  }

  const { error } = await supabase
    .from("kudo_hearts")
    .insert({ kudo_id: kudoId, user_id: userId });

  if (!error) {
    return true;
  }
  if (error.code === POSTGRES_UNIQUE_VIOLATION) {
    return (await selectHeartId(supabase, kudoId, userId)) !== null;
  }
  throw error;
}

async function selectHeartId(
  supabase: SupabaseServerClient,
  kudoId: string,
  userId: string,
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("kudo_hearts")
    .select("id")
    .eq("kudo_id", kudoId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data;
}

async function readHeartCount(
  supabase: SupabaseServerClient,
  kudoId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("kudos")
    .select("heart_count")
    .eq("id", kudoId)
    .maybeSingle();

  if (error || !data) {
    throw error ?? new Error(`toggleKudoHeart: kudo ${kudoId} not found`);
  }

  // `createClient()` carries no `Database` generic (see server.ts), so
  // `data.heart_count` is `any` at the type level even though the column is
  // `integer NOT NULL` in 0006 — assigning through `unknown` first turns
  // this boundary value into a real runtime-checked `number` instead of
  // letting an `any` reach the caller.
  const heartCount: unknown = data.heart_count;
  if (typeof heartCount !== "number") {
    throw new Error(
      `toggleKudoHeart: kudos.heart_count for ${kudoId} was not a number`,
    );
  }
  return heartCount;
}
