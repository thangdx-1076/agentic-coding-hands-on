/**
 * Per-slug decorative name graphic (asset-only, not part of any copy
 * contract — see plan.md § Assets). Small watermark-style overlay stamped
 * on top of the shared `Award_BG.png` ring on each award card. Hoisted out
 * of `(home)/_components/award-card.tsx` (phase-02) because `/awards`
 * renders the same cards and must not import across the `(home)` segment
 * boundary. Each graphic's own `width`/`height` come from its real
 * intrinsic size (`momorph/media-nodes.json` `MM_MEDIA_*` entries) — they
 * differ per name (e.g. MVP is 116×52, Top Project Leader is 232×64) —
 * passing one shared 221×35 pair for all of them mismatched the real
 * file's aspect ratio and triggered Next.js' "width or height modified,
 * but not the other" console warning.
 */
export const AWARD_NAME_GRAPHIC: Record<
  string,
  { src: string; width: number; height: number }
> = {
  "top-talent": { src: "/home/Top_Talent.png", width: 222, height: 36 },
  "top-project": { src: "/home/Top_Project.png", width: 232, height: 35 },
  "top-project-leader": {
    src: "/home/Top_Project_Leader.png",
    width: 232,
    height: 64,
  },
  "best-manager": { src: "/home/Best_Manager.png", width: 232, height: 30 },
  "signature-2025-creator": {
    src: "/home/Signature_2025_Creator.png",
    width: 232,
    height: 54,
  },
  mvp: { src: "/home/MVP.png", width: 116, height: 52 },
};
