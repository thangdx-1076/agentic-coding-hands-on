/**
 * The Sun* master hashtag list offered by the "Viết Kudo" compose picker.
 *
 * Read verbatim off the design's own dropdown rows — `mms_A/B/C_Hashtag đã
 * chọn` plus the five `mms_D`-shaped rows under `1002:13102` on
 * https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/p9zO-c4a4x
 * (`query_section` on `1002:13102`, node ids `1002:13190`, `1002:13212`,
 * `1002:13221`, `I1002:13104;490:5559`, `I1002:13131;490:5559`,
 * `I1002:13137;490:5559`, `I1002:13151;490:5559`, `I1002:13227;490:5559`),
 * in that frame's own top-to-bottom order.
 *
 * ONE deliberate departure from the design text: node `1002:13190` reads
 * `#High-perorming`, which is a misspelling of the Sun* value
 * "High-performing" — every other row is spelled correctly, and this list is
 * user-visible content rather than a visual value, so the typo is not
 * reproduced. Casing IS reproduced as drawn (seven shouted rows, one
 * capitalised) because that is the design's own content choice.
 *
 * Stored WITHOUT the leading `#`: the `#` is a display prefix the picker and
 * the chip row each add themselves (`kudos-hashtag-picker.tsx`,
 * `kudos-hashtag-field.tsx`), and `public.kudos.hashtags` stores bare values
 * (`0008_kudos_demo_seed.sql:117`).
 *
 * This is a suggestion vocabulary, NOT a validation whitelist — hashtags stay
 * free-text (plans/260907-2338-kudos-write-modal/clarifications.md § "Hashtag
 * là free-text..."). Nothing rejects a tag for being absent from this list.
 */
export const KUDOS_HASHTAG_MASTER = [
  "High-performing",
  "BE PROFESSIONAL",
  "BE OPTIMISTIC",
  "BE A TEAM",
  "THINK OUTSIDE THE BOX",
  "GET RISKY",
  "GO FAST",
  "WASSHOI",
] as const;
