"use client";

import { useRef, useState } from "react";

import type { HeartOverride } from "../_utils/kudos-card-state";

import type { KudosCard as KudosCardModel } from "@/dal/kudos";

export type ToggleHeartResult =
  | { ok: true; hearted: boolean; heartCount: number }
  | { ok: false; reason: "unauthenticated" | "error" };

export type KudosHearts = {
  /** Keyed by kudo id — merged over the server-rendered state by
   * `deriveKudosCardState`. */
  heartOverrides: Record<string, HeartOverride>;
  /** Kudo ids with a toggle currently in flight (BR-004) — render-visible
   * mirror of the synchronous `inFlight` ref below, so a caller can fold
   * it into `heartDisabled` while the Server Action is still pending. A
   * NEW `Set` every time it changes (never mutated in place), so a
   * caller/effect comparing by reference sees exactly the renders where
   * membership actually changed. */
  pendingIds: Set<string>;
  toggleHeart: (card: KudosCardModel) => void;
};

/**
 * The heart toggle's client state for `/kudos` (F008): call the Server
 * Action, then record the `hearted`/`heartCount` IT returned, keyed by
 * kudo id. Deliberately NOT optimistic — nothing moves until the action
 * answers `ok`, so a rejected or failed toggle leaves the card exactly as
 * the server rendered it.
 *
 * `viewerId` is the server-verified viewer, never a client guess. The
 * anonymous / own-kudo guard below is belt-and-braces: both cases already
 * render the button `disabled`, and migration `0007`'s Postgres policies
 * are the real enforcement point.
 *
 * One toggle per kudo may be in flight at a time (BR-004): while it is,
 * `pendingIds` holds its id so the caller can fold that into
 * `heartDisabled` and show the button as busy until the server answers,
 * success or failure — Postgres already keeps itself consistent under a
 * double-click regardless (`kudo_hearts`'s `UNIQUE(kudo_id, user_id)`,
 * 0007, settles the race), but consistency is not the same as obeying the
 * user: two clicks that both read "not hearted" race, one loses, and the
 * second click would otherwise be silently swallowed instead of
 * un-hearting. Since the toggle is deliberately not optimistic, the button
 * showed nothing at all in the meantime before `pendingIds` existed, so a
 * user who clicked twice on a slow connection ended up in a state they
 * did not ask for. Dropping the second click is the honest behaviour: it
 * reflects what the UI is actually showing.
 *
 * `inFlight` stays a `useRef` — the guard above must be readable and
 * writable SYNCHRONOUSLY within one click handler; a `useState` set would
 * not have applied yet when a second click lands in the same tick, which
 * is precisely the case being guarded. `pendingIds` is a separate
 * `useState` mirror of the same ref, written in the same two places,
 * purely so a render can see it — the ref itself is never read for
 * rendering.
 *
 * The own-kudo guard reads `card.isOwn` (F008 BR-005, migration `0016`),
 * never `card.sender.id === viewerId` — that comparison is always false
 * for an anonymous kudo's own sender, since `sender.id` is masked `null`
 * on the view for every reader (0009). This guard is belt-and-braces
 * (the button is already `disabled` for this case via
 * `deriveKudosCardState`); `kudo_hearts_insert_own` (0007) is the real
 * enforcement point either way.
 */
export function useKudosHearts(
  viewerId: string | null,
  toggleKudoHeartAction: (kudoId: string) => Promise<ToggleHeartResult>,
): KudosHearts {
  const [heartOverrides, setHeartOverrides] = useState<
    Record<string, HeartOverride>
  >({});
  const inFlight = useRef<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  function toggleHeart(card: KudosCardModel): void {
    if (viewerId === null || card.isOwn === true) return;
    if (inFlight.current.has(card.id)) return;

    inFlight.current.add(card.id);
    setPendingIds(new Set(inFlight.current));
    void (async () => {
      try {
        const result = await toggleKudoHeartAction(card.id);
        if (result.ok) {
          setHeartOverrides((prev) => ({
            ...prev,
            [card.id]: {
              hearted: result.hearted,
              heartCount: result.heartCount,
            },
          }));
        }
      } catch {
        // Transport failure only — action fails closed server-side.
      } finally {
        // `finally`, so a rejected toggle does not wedge the button for the
        // rest of the session.
        inFlight.current.delete(card.id);
        setPendingIds(new Set(inFlight.current));
      }
    })();
  }

  return { heartOverrides, pendingIds, toggleHeart };
}
