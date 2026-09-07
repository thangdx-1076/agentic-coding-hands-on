"use client";

import { useState } from "react";

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
 */
export function useKudosHearts(
  viewerId: string | null,
  toggleKudoHeartAction: (kudoId: string) => Promise<ToggleHeartResult>,
): KudosHearts {
  const [heartOverrides, setHeartOverrides] = useState<
    Record<string, HeartOverride>
  >({});

  function toggleHeart(card: KudosCardModel): void {
    if (viewerId === null || card.sender.id === viewerId) return;
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
      }
    })();
  }

  return { heartOverrides, toggleHeart };
}
