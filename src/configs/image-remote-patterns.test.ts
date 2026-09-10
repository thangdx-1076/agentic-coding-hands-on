import { hasRemoteMatch } from "next/dist/shared/lib/match-remote-pattern";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  OAUTH_AVATAR_PATTERNS,
  resolveImagesRemoteConfig,
  type ImageRemotePattern,
} from "@/configs/image-remote-patterns";

/**
 * The assertions below run Next's OWN matcher
 * (`next/dist/shared/lib/match-remote-pattern`, the same
 * `hasRemoteMatch` the `next/image` component calls before it throws
 * "Invalid src prop"), never a re-implementation of the wildcard rules.
 * A pattern list that satisfies these is a list `next/image` accepts.
 */
function accepts(patterns: ImageRemotePattern[], src: string): boolean {
  return hasRemoteMatch([], patterns, new URL(src));
}

/** The exact URL from the crash report: a Google avatar as
 * `handle_new_user` (migration 0002) copies it into
 * `public.users.avatar_url`, size suffix and all. */
const GOOGLE_AVATAR_SRC =
  "https://lh3.googleusercontent.com/a/ACg8ocJvlheROXlldPmduJrQplSLqoAAtwEDlGFO4_qBpJqDJ51kvcWc=s96-c";

const LOCAL_SUPABASE_URL = "http://127.0.0.1:55321";
const HOSTED_SUPABASE_URL = "https://abcdefgh.supabase.co";

describe("OAUTH_AVATAR_PATTERNS", () => {
  it("accepts the google avatar url that crashed the sunner search", () => {
    expect(accepts(OAUTH_AVATAR_PATTERNS, GOOGLE_AVATAR_SRC)).toBe(true);
  });

  it("accepts the legacy `/a-/` avatar path older accounts still serve", () => {
    expect(
      accepts(
        OAUTH_AVATAR_PATTERNS,
        "https://lh3.googleusercontent.com/a-/AOh14GhABCdef123=s96-c",
      ),
    ).toBe(true);
  });

  it("accepts an avatar url carrying a query string", () => {
    expect(
      accepts(
        OAUTH_AVATAR_PATTERNS,
        "https://lh3.googleusercontent.com/a/ACg8ocABC?sz=200",
      ),
    ).toBe(true);
  });

  it("does not open non-avatar paths on the same google cdn", () => {
    expect(
      accepts(
        OAUTH_AVATAR_PATTERNS,
        "https://lh3.googleusercontent.com/pw/photo-library-object",
      ),
    ).toBe(false);
  });

  it("does not open the avatar path over plain http", () => {
    expect(
      accepts(OAUTH_AVATAR_PATTERNS, "http://lh3.googleusercontent.com/a/ACg8"),
    ).toBe(false);
  });

  it("does not open a look-alike host", () => {
    expect(
      accepts(
        OAUTH_AVATAR_PATTERNS,
        "https://lh3.googleusercontent.com.evil.test/a/ACg8",
      ),
    ).toBe(false);
  });
});

describe("resolveImagesRemoteConfig — supabase storage", () => {
  it("accepts a public storage object on the configured host", () => {
    const { remotePatterns } = resolveImagesRemoteConfig(HOSTED_SUPABASE_URL);
    expect(
      accepts(
        remotePatterns,
        "https://abcdefgh.supabase.co/storage/v1/object/public/kudos/a/b.png",
      ),
    ).toBe(true);
  });

  it("keeps non-public paths on that host closed", () => {
    const { remotePatterns } = resolveImagesRemoteConfig(HOSTED_SUPABASE_URL);
    expect(
      accepts(
        remotePatterns,
        "https://abcdefgh.supabase.co/storage/v1/object/authenticated/kudos/a.png",
      ),
    ).toBe(false);
  });

  it("carries the port through for the local instance", () => {
    const { remotePatterns } = resolveImagesRemoteConfig(LOCAL_SUPABASE_URL);
    expect(
      accepts(
        remotePatterns,
        "http://127.0.0.1:55321/storage/v1/object/public/kudos/a.png",
      ),
    ).toBe(true);
    expect(
      accepts(
        remotePatterns,
        "http://127.0.0.1:54321/storage/v1/object/public/kudos/a.png",
      ),
    ).toBe(false);
  });
});

describe("resolveImagesRemoteConfig — dangerouslyAllowLocalIP", () => {
  it.each([
    ["http://localhost:55321", true],
    ["http://127.0.0.1:55321", true],
    ["http://[::1]:55321", true],
    ["http://10.1.2.3:55321", true],
    ["http://172.16.0.9:55321", true],
    ["http://172.31.255.1:55321", true],
    ["http://192.168.1.20:55321", true],
    ["https://abcdefgh.supabase.co", false],
    ["http://172.15.0.1:55321", false],
    ["http://172.32.0.1:55321", false],
    ["http://110.1.2.3:55321", false],
    ["http://192.169.1.20:55321", false],
  ])("%s -> %s", (supabaseUrl, expected) => {
    expect(resolveImagesRemoteConfig(supabaseUrl).dangerouslyAllowLocalIP).toBe(
      expected,
    );
  });
});

describe("resolveImagesRemoteConfig — bad env", () => {
  it.each([
    ["an empty value", ""],
    ["an unparseable value", "not-a-url"],
    ["a non-http scheme", "ftp://abcdefgh.supabase.co"],
  ])("keeps avatars working and stays closed on %s", (_label, supabaseUrl) => {
    const config = resolveImagesRemoteConfig(supabaseUrl);

    expect(config.remotePatterns).toEqual(OAUTH_AVATAR_PATTERNS);
    expect(config.dangerouslyAllowLocalIP).toBe(false);
    expect(accepts(config.remotePatterns, GOOGLE_AVATAR_SRC)).toBe(true);
  });
});

describe("resolveImagesRemoteConfig — default argument", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads NEXT_PUBLIC_SUPABASE_URL when called with no argument", () => {
    // `vitest.config.ts` sets this to `http://127.0.0.1:54321`.
    const { remotePatterns, dangerouslyAllowLocalIP } =
      resolveImagesRemoteConfig();

    expect(dangerouslyAllowLocalIP).toBe(true);
    expect(
      accepts(
        remotePatterns,
        "http://127.0.0.1:54321/storage/v1/object/public/kudos/a.png",
      ),
    ).toBe(true);
  });

  it("still serves avatars when the env var is unset entirely", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);

    const config = resolveImagesRemoteConfig();

    expect(config.remotePatterns).toEqual(OAUTH_AVATAR_PATTERNS);
    expect(config.dangerouslyAllowLocalIP).toBe(false);
  });
});

describe("next.config.ts wiring", () => {
  /**
   * The unit tests above prove the pattern LIST is right; this one proves
   * `next.config.ts` actually ships it. Without it the module could be
   * correct and unreferenced — which is precisely the state that crashed
   * the Sunner search dropdown.
   */
  it("exposes the avatar patterns through the real config", async () => {
    const mod = await import("../../next.config");
    const config = mod.default as {
      images?: { remotePatterns?: ImageRemotePattern[] };
    };
    const patterns = config.images?.remotePatterns ?? [];

    expect(accepts(patterns, GOOGLE_AVATAR_SRC)).toBe(true);
  });
});
