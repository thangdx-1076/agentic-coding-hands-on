import { describe, expect, it } from "vitest";

import { parseProfileId } from "./parse-profile-id";

const VIEWER_ID = "11111111-2222-3333-4444-555555555555";
const OTHER_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

describe("parseProfileId", () => {
  it("`?id=` absent (undefined) → self (FR-401, FUN_005 b1)", () => {
    expect(parseProfileId(undefined, VIEWER_ID)).toEqual({ kind: "self" });
  });

  it("`?id=` empty string → self (FR-401, D005)", () => {
    expect(parseProfileId("", VIEWER_ID)).toEqual({ kind: "self" });
  });

  it("repeated key (`string[]`, 2 elements) → reject (FR-403, FUN_005 b2)", () => {
    expect(parseProfileId(["a", "b"], VIEWER_ID)).toEqual({ kind: "reject" });
  });

  it("repeated key with a SINGLE element → reject (still an array, not [0])", () => {
    expect(parseProfileId(["chỉ-một-phần-tử"], VIEWER_ID)).toEqual({
      kind: "reject",
    });
  });

  it("malformed id (`not-a-uuid`) → reject (FR-402, FUN_004)", () => {
    expect(parseProfileId("not-a-uuid", VIEWER_ID)).toEqual({
      kind: "reject",
    });
  });

  it("a valid UUID trailed by extra characters → reject (proves the `$` anchor)", () => {
    expect(parseProfileId(`${OTHER_ID}xxx`, VIEWER_ID)).toEqual({
      kind: "reject",
    });
  });

  it("a valid UUID prefixed by extra characters → reject (proves the `^` anchor)", () => {
    expect(parseProfileId(`xxx${OTHER_ID}`, VIEWER_ID)).toEqual({
      kind: "reject",
    });
  });

  it("valid UUID equal to viewerId → canonical (FR-404, FUN_002)", () => {
    expect(parseProfileId(VIEWER_ID, VIEWER_ID)).toEqual({
      kind: "canonical",
    });
  });

  it("valid UUID equal to viewerId, uppercase → canonical (case-insensitive compare)", () => {
    expect(parseProfileId(VIEWER_ID.toUpperCase(), VIEWER_ID)).toEqual({
      kind: "canonical",
    });
  });

  it("valid UUID different from viewerId → other, lowercased id (FR-406)", () => {
    expect(parseProfileId(OTHER_ID.toUpperCase(), VIEWER_ID)).toEqual({
      kind: "other",
      id: OTHER_ID,
    });
  });

  it("a valid-but-nonexistent UUID is NOT rejected by the parser — a DB miss is the caller's 404, not a parse failure", () => {
    const neverSeededId = "99999999-9999-9999-9999-999999999999";
    expect(parseProfileId(neverSeededId, VIEWER_ID)).toEqual({
      kind: "other",
      id: neverSeededId,
    });
  });

  it("regex is stateless across calls — two consecutive calls with the same valid UUID both resolve the same way (no `lastIndex` leak from a `g` flag)", () => {
    const first = parseProfileId(OTHER_ID, VIEWER_ID);
    const second = parseProfileId(OTHER_ID, VIEWER_ID);
    expect(first).toEqual({ kind: "other", id: OTHER_ID });
    expect(second).toEqual({ kind: "other", id: OTHER_ID });
  });
});
