import { existsSync } from "fs";
import { join } from "path";

import { describe, expect, it } from "vitest";

import {
  isBadgeKey,
  secretBoxBadgeAsset,
  secretBoxBadgeAssetLabel,
  SECRET_BOX_BADGE_ASSET_SIZE,
  type BadgeKey,
} from "./secret-box-badge-asset";

const ALL_BADGE_KEYS: BadgeKey[] = [
  "stay-gold",
  "flow-to-horizon",
  "touch-of-light",
  "beyond-the-boundary",
  "revival",
  "root-further",
];

describe("secretBoxBadgeAsset", () => {
  it.each(ALL_BADGE_KEYS)(
    "trả về path /standards/badge-%s.png, size 64",
    (key) => {
      const result = secretBoxBadgeAsset(key);
      expect(result).toEqual({
        asset: `/standards/badge-${key}.png`,
        size: SECRET_BOX_BADGE_ASSET_SIZE,
      });
    },
  );

  it.each(ALL_BADGE_KEYS)(
    "asset của %s tồn tại thật trong public/standards (bắt lỗi typo stem)",
    (key) => {
      const { asset } = secretBoxBadgeAsset(key);
      const absolutePath = join(process.cwd(), "public", asset);
      expect(existsSync(absolutePath)).toBe(true);
    },
  );
});

describe("isBadgeKey", () => {
  it.each(ALL_BADGE_KEYS)("chấp nhận giá trị hợp lệ %s", (key) => {
    expect(isBadgeKey(key)).toBe(true);
  });

  it("từ chối giá trị lạ (fail closed)", () => {
    expect(isBadgeKey("not-a-real-badge")).toBe(false);
    expect(isBadgeKey("")).toBe(false);
    expect(isBadgeKey("<script>alert(1)</script>")).toBe(false);
  });
});

describe("secretBoxBadgeAssetLabel", () => {
  it("Title Case hoá kebab key thành tên hiển thị", () => {
    expect(secretBoxBadgeAssetLabel("stay-gold")).toBe("Stay Gold");
    expect(secretBoxBadgeAssetLabel("flow-to-horizon")).toBe(
      "Flow To Horizon",
    );
    expect(secretBoxBadgeAssetLabel("beyond-the-boundary")).toBe(
      "Beyond The Boundary",
    );
    expect(secretBoxBadgeAssetLabel("root-further")).toBe("Root Further");
  });
});
