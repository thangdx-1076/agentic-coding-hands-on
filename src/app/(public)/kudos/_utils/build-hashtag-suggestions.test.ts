import { describe, expect, it } from "vitest";

import { buildHashtagSuggestions } from "./build-hashtag-suggestions";

import { KUDOS_HASHTAG_MASTER } from "@/constants/kudos-hashtags";

describe("buildHashtagSuggestions", () => {
  it("offers the whole master list even when no kudo has ever been tagged", () => {
    expect(buildHashtagSuggestions([])).toEqual([...KUDOS_HASHTAG_MASTER]);
  });

  it("keeps derived tags the master list does not cover, after the master ones", () => {
    const result = buildHashtagSuggestions(["Dedicated", "IDOL GIỚI TRẺ"]);

    expect(result.slice(0, KUDOS_HASHTAG_MASTER.length)).toEqual([
      ...KUDOS_HASHTAG_MASTER,
    ]);
    expect(result.slice(KUDOS_HASHTAG_MASTER.length)).toEqual([
      "Dedicated",
      "IDOL GIỚI TRẺ",
    ]);
  });

  it("renders one row per tag when a derived tag differs from its master twin only by case or padding", () => {
    const result = buildHashtagSuggestions(["  go fast ", "WASSHOI"]);

    // The curated spelling wins — master is scanned first — and neither
    // near-duplicate adds a second row (the defect the user saw: repeated
    // entries in the panel).
    expect(result).toEqual([...KUDOS_HASHTAG_MASTER]);
  });

  it("drops blank and whitespace-only derived values", () => {
    expect(buildHashtagSuggestions(["", "   ", "Dedicated"])).toEqual([
      ...KUDOS_HASHTAG_MASTER,
      "Dedicated",
    ]);
  });

  it("collapses derived duplicates of each other down to the first spelling seen", () => {
    expect(
      buildHashtagSuggestions(["Inspring", "inspring", "INSPRING"]),
    ).toEqual([...KUDOS_HASHTAG_MASTER, "Inspring"]);
  });

  it("trims a derived tag that survives", () => {
    expect(buildHashtagSuggestions(["  Dedicated  "])).toEqual([
      ...KUDOS_HASHTAG_MASTER,
      "Dedicated",
    ]);
  });
});
