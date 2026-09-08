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
 * One toggle per kudo may be in flight at a time. Postgres already keeps
 * itself consistent under a double-click — `kudo_hearts`'s
 * `UNIQUE(kudo_id, user_id)` (0007) settles the race — but consistency is
 * not the same as obeying the user: two clicks that both read "not
 * hearted" race, one loses, and the second click is silently swallowed
 * instead of un-hearting. Since the toggle is deliberately not optimistic,
 * the button also shows nothing in the meantime, so a user who clicks
 * twice on a slow connection ends up in a state they did not ask for.
 * Dropping the second click is the honest behaviour: it reflects what the
 * UI is actually showing.
 *
 * A `useRef` rather than state on purpose — this must be readable and
 * writable synchronously within one click handler. A `useState` set would
 * not have applied yet when a second click lands in the same tick, which
 * is precisely the case being guarded.
 */
export function useKudosHearts(
  viewerId: string | null,
  toggleKudoHeartAction: (kudoId: string) => Promise<ToggleHeartResult>,
): KudosHearts {
  const [heartOverrides, setHeartOverrides] = useState<
    Record<string, HeartOverride>
  >({});
  const inFlight = useRef<Set<string>>(new Set());

  function toggleHeart(card: KudosCardModel): void {
    if (viewerId === null || card.sender.id === viewerId) return;
    if (inFlight.current.has(card.id)) return;

    inFlight.current.add(card.id);
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
      }
    })();
  }

  return { heartOverrides, toggleHeart };
}
