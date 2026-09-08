/**
 * Badge artwork lookup for the Secret Box reveal state (mm:1466:7684 spec row
 * C, https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/J3-4YFIpMM).
 *
 * The 6 kebab-case keys match the `CHECK` constraint migration 0011 (phase
 * 04, out of this file's ownership) puts on `secret_box_openings.badge_key`,
 * ordered by the spec row C draw probability (Stay Gold 30% → Root Further
 * 5%) rather than alphabetically, so a reviewer can cross-reference the two
 * without re-sorting either list.
 *
 * All 6 PNGs already exist in this repo (`/standards` route, phase 02 of a
 * prior plan) at a verified intrinsic 64×64 — see `standards-copy.ts`'s
 * `SECRET_BOX_BADGES`. This file does NOT hoist that table: reusing it would
 * be a sideways import across route features (`(public)/standards` ← this
 * route), dragging `/standards`'s own untagged `standards.spec.ts` C5 into
 * this PR's blast radius for zero benefit — the two tables would need to
 * stay in lockstep anyway since neither is the other's source of truth.
 *
 * `secretBoxBadgeAsset`'s output path is a plain template literal, not a
 * lookup table: every `BadgeKey` value IS the asset's filename stem
 * (`stay-gold` → `badge-stay-gold.png`), verified 1:1 against the existing
 * files in `secret-box-badge-asset.test.ts` via `fs.existsSync`.
 */
export type BadgeKey =
  | "stay-gold"
  | "flow-to-horizon"
  | "touch-of-light"
  | "beyond-the-boundary"
  | "revival"
  | "root-further";

const BADGE_KEYS: readonly BadgeKey[] = [
  "stay-gold",
  "flow-to-horizon",
  "touch-of-light",
  "beyond-the-boundary",
  "revival",
  "root-further",
];

/** Every badge artwork is the same 64×64 circle (BR-004: no upscale). */
export const SECRET_BOX_BADGE_ASSET_SIZE = 64;

export type SecretBoxBadgeAsset = {
  asset: string;
  size: number;
};

/**
 * Narrows an untrusted string (e.g. a raw RPC response field, before it's
 * safe to interpolate into an asset path) down to `BadgeKey`. Callers MUST
 * check this (or otherwise narrow) before calling `secretBoxBadgeAsset` —
 * this file does not fabricate a fallback image for an unrecognized key,
 * per the "fail closed" rule in phase-03's Security Considerations.
 */
export function isBadgeKey(value: string): value is BadgeKey {
  return (BADGE_KEYS as readonly string[]).includes(value);
}

/** `badgeKey` must already be a validated `BadgeKey` — see `isBadgeKey`. */
export function secretBoxBadgeAsset(badgeKey: BadgeKey): SecretBoxBadgeAsset {
  return {
    asset: `/standards/badge-${badgeKey}.png`,
    size: SECRET_BOX_BADGE_ASSET_SIZE,
  };
}

/**
 * Accessible name for the revealed badge `<Image>` — there is no spec row
 * or `messages/*.json` key for this (out of this phase's ownership), so it
 * is derived mechanically from the kebab key rather than invented business
 * copy: `"stay-gold"` → `"Stay Gold"`. Screen-reader-only text, never
 * rendered visually (no design caption exists in this dialog, unlike
 * `/standards`' `SecretBoxBadge` which has a visible `<p>` caption).
 */
export function secretBoxBadgeAssetLabel(badgeKey: BadgeKey): string {
  return badgeKey
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
