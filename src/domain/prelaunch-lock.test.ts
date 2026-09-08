import { describe, it, expect } from "vitest";

import {
  isPrelaunchLockEnabled,
  planProxy,
  redirectStatusFor,
} from "./prelaunch-lock";

/**
 * Unit test for prelaunch lock decision function
 * ==============================================
 *
 * Exhaustive truth table for the pure decision function `planProxy`,
 * which determines whether to redirect, pass, or auth-check each request
 * based on lock state and countdown status.
 *
 * Matrix dimensions:
 * - lockEnabled ∈ {true, false}
 * - reached ∈ {true, false}
 * - pathname ∈ {"/", "/login", "/todo", "/todo/abc", "/awards", "/standards",
 *               "/profile", "/prelaunch", "/auth/callback", "/api/x",
 *               "/favicon.ico", "/logo.png", "/kudos", "/khong-ton-tai"}
 *
 * Integration contract: plan.md § "Integration contract"
 * Spec references: technical-spec.md § 3.2, § 4.6; BR-001 through BR-005
 */

describe("isPrelaunchLockEnabled", () => {
  describe("truthiness: only 'true' (case-insensitive) enables lock", () => {
    it("returns true when raw is 'true'", () => {
      expect(isPrelaunchLockEnabled("true")).toBe(true);
    });

    it("returns true when raw is 'TRUE' (case-insensitive)", () => {
      expect(isPrelaunchLockEnabled("TRUE")).toBe(true);
    });

    it("returns false when raw is 'false'", () => {
      expect(isPrelaunchLockEnabled("false")).toBe(false);
    });

    it("returns false when raw is '0'", () => {
      expect(isPrelaunchLockEnabled("0")).toBe(false);
    });

    it("returns false when raw is '1'", () => {
      expect(isPrelaunchLockEnabled("1")).toBe(false);
    });

    it("returns false when raw is empty string", () => {
      expect(isPrelaunchLockEnabled("")).toBe(false);
    });

    it("returns false when raw is undefined", () => {
      expect(isPrelaunchLockEnabled(undefined)).toBe(false);
    });
  });
});

describe("planProxy — exhaustive truth table", () => {
  // ===== LOCK OFF (lockEnabled = false) =====
  describe("lockEnabled = false (lock OFF — all routes accessible)", () => {
    it("/prelaunch → pass (not locked)", () => {
      const result = planProxy({
        pathname: "/prelaunch",
        lockEnabled: false,
        reached: false,
      });
      expect(result).toEqual({ kind: "pass" });
    });

    it("/ → auth (legacy whitelist)", () => {
      const result = planProxy({
        pathname: "/",
        lockEnabled: false,
        reached: false,
      });
      expect(result).toEqual({ kind: "auth" });
    });

    it("/login → auth (legacy whitelist)", () => {
      const result = planProxy({
        pathname: "/login",
        lockEnabled: false,
        reached: false,
      });
      expect(result).toEqual({ kind: "auth" });
    });

    it("/todo → auth (legacy whitelist)", () => {
      const result = planProxy({
        pathname: "/todo",
        lockEnabled: false,
        reached: false,
      });
      expect(result).toEqual({ kind: "auth" });
    });

    it("/todo/abc → auth (legacy whitelist /todo/*)", () => {
      const result = planProxy({
        pathname: "/todo/abc",
        lockEnabled: false,
        reached: false,
      });
      expect(result).toEqual({ kind: "auth" });
    });

    it("/awards → auth (legacy whitelist)", () => {
      const result = planProxy({
        pathname: "/awards",
        lockEnabled: false,
        reached: false,
      });
      expect(result).toEqual({ kind: "auth" });
    });

    it("/standards → auth (legacy whitelist)", () => {
      const result = planProxy({
        pathname: "/standards",
        lockEnabled: false,
        reached: false,
      });
      expect(result).toEqual({ kind: "auth" });
    });

    it("/profile → auth (legacy whitelist)", () => {
      const result = planProxy({
        pathname: "/profile",
        lockEnabled: false,
        reached: false,
      });
      expect(result).toEqual({ kind: "auth" });
    });

    it("/kudos → pass (not in whitelist)", () => {
      const result = planProxy({
        pathname: "/kudos",
        lockEnabled: false,
        reached: false,
      });
      expect(result).toEqual({ kind: "pass" });
    });

    it("/khong-ton-tai → pass (not in whitelist)", () => {
      const result = planProxy({
        pathname: "/khong-ton-tai",
        lockEnabled: false,
        reached: false,
      });
      expect(result).toEqual({ kind: "pass" });
    });

    it("/auth/callback → pass (auth/* exempt)", () => {
      const result = planProxy({
        pathname: "/auth/callback",
        lockEnabled: false,
        reached: false,
      });
      expect(result).toEqual({ kind: "pass" });
    });

    it("/api/x → pass (api/* exempt)", () => {
      const result = planProxy({
        pathname: "/api/x",
        lockEnabled: false,
        reached: false,
      });
      expect(result).toEqual({ kind: "pass" });
    });

    it("/favicon.ico → pass (static file exempt)", () => {
      const result = planProxy({
        pathname: "/favicon.ico",
        lockEnabled: false,
        reached: false,
      });
      expect(result).toEqual({ kind: "pass" });
    });

    it("/logo.png → pass (static file exempt)", () => {
      const result = planProxy({
        pathname: "/logo.png",
        lockEnabled: false,
        reached: false,
      });
      expect(result).toEqual({ kind: "pass" });
    });
  });

  // ===== LOCK ON, COUNTDOWN NOT REACHED =====
  describe("lockEnabled = true, reached = false (lock ON, countdown pending)", () => {
    // The lock outranks the legacy whitelist. FR-102 says "toàn bộ điều hướng đến
    // các trang khác bị khoá" — a lock that let the homepage, /awards and
    // /standards through would wall off nothing that matters, since those ARE
    // the public site. BR-005 is a separate axis: it governs whether a request
    // that is NOT being redirected has to pay for Supabase, never whether the
    // redirect happens.
    describe("legacy whitelist routes → redirect (the lock outranks the whitelist)", () => {
      it("/ → redirect /prelaunch", () => {
        const result = planProxy({
          pathname: "/",
          lockEnabled: true,
          reached: false,
        });
        expect(result).toEqual({ kind: "redirect", to: "/prelaunch" });
      });

      it("/login → redirect /prelaunch", () => {
        const result = planProxy({
          pathname: "/login",
          lockEnabled: true,
          reached: false,
        });
        expect(result).toEqual({ kind: "redirect", to: "/prelaunch" });
      });

      it("/todo → redirect /prelaunch", () => {
        const result = planProxy({
          pathname: "/todo",
          lockEnabled: true,
          reached: false,
        });
        expect(result).toEqual({ kind: "redirect", to: "/prelaunch" });
      });

      it("/todo/abc → redirect /prelaunch", () => {
        const result = planProxy({
          pathname: "/todo/abc",
          lockEnabled: true,
          reached: false,
        });
        expect(result).toEqual({ kind: "redirect", to: "/prelaunch" });
      });

      it("/awards → redirect /prelaunch", () => {
        const result = planProxy({
          pathname: "/awards",
          lockEnabled: true,
          reached: false,
        });
        expect(result).toEqual({ kind: "redirect", to: "/prelaunch" });
      });

      it("/standards → redirect /prelaunch", () => {
        const result = planProxy({
          pathname: "/standards",
          lockEnabled: true,
          reached: false,
        });
        expect(result).toEqual({ kind: "redirect", to: "/prelaunch" });
      });

      it("/profile → redirect /prelaunch", () => {
        const result = planProxy({
          pathname: "/profile",
          lockEnabled: true,
          reached: false,
        });
        expect(result).toEqual({ kind: "redirect", to: "/prelaunch" });
      });
    });

    describe("prelaunch and exempt routes → pass", () => {
      it("/prelaunch → pass (can view prelaunch while locked)", () => {
        const result = planProxy({
          pathname: "/prelaunch",
          lockEnabled: true,
          reached: false,
        });
        expect(result).toEqual({ kind: "pass" });
      });

      it("/auth/callback → pass (auth/* exempt)", () => {
        const result = planProxy({
          pathname: "/auth/callback",
          lockEnabled: true,
          reached: false,
        });
        expect(result).toEqual({ kind: "pass" });
      });

      it("/api/x → pass (api/* exempt)", () => {
        const result = planProxy({
          pathname: "/api/x",
          lockEnabled: true,
          reached: false,
        });
        expect(result).toEqual({ kind: "pass" });
      });

      it("/favicon.ico → pass (static file exempt)", () => {
        const result = planProxy({
          pathname: "/favicon.ico",
          lockEnabled: true,
          reached: false,
        });
        expect(result).toEqual({ kind: "pass" });
      });

      it("/logo.png → pass (static file exempt)", () => {
        const result = planProxy({
          pathname: "/logo.png",
          lockEnabled: true,
          reached: false,
        });
        expect(result).toEqual({ kind: "pass" });
      });
    });

    describe("other routes → redirect /prelaunch (BR-001, BR-005)", () => {
      it("/kudos → redirect /prelaunch (not whitelisted, lock ON)", () => {
        const result = planProxy({
          pathname: "/kudos",
          lockEnabled: true,
          reached: false,
        });
        expect(result).toEqual({ kind: "redirect", to: "/prelaunch" });
      });

      it("/khong-ton-tai → redirect /prelaunch (not whitelisted, lock ON)", () => {
        const result = planProxy({
          pathname: "/khong-ton-tai",
          lockEnabled: true,
          reached: false,
        });
        expect(result).toEqual({ kind: "redirect", to: "/prelaunch" });
      });
    });
  });

  // ===== LOCK ON, COUNTDOWN REACHED =====
  describe("lockEnabled = true, reached = true (lock ON but countdown finished)", () => {
    describe("/prelaunch → redirect / (FR-103: lock off after reached, /prelaunch → /)", () => {
      it("/prelaunch → redirect / (reached, lock still ON but countdown done)", () => {
        const result = planProxy({
          pathname: "/prelaunch",
          lockEnabled: true,
          reached: true,
        });
        expect(result).toEqual({ kind: "redirect", to: "/" });
      });
    });

    describe("legacy whitelist → auth (normal auth flow resumed)", () => {
      it("/ → auth", () => {
        const result = planProxy({
          pathname: "/",
          lockEnabled: true,
          reached: true,
        });
        expect(result).toEqual({ kind: "auth" });
      });

      it("/login → auth", () => {
        const result = planProxy({
          pathname: "/login",
          lockEnabled: true,
          reached: true,
        });
        expect(result).toEqual({ kind: "auth" });
      });

      it("/todo/abc → auth", () => {
        const result = planProxy({
          pathname: "/todo/abc",
          lockEnabled: true,
          reached: true,
        });
        expect(result).toEqual({ kind: "auth" });
      });

      it("/awards → auth", () => {
        const result = planProxy({
          pathname: "/awards",
          lockEnabled: true,
          reached: true,
        });
        expect(result).toEqual({ kind: "auth" });
      });

      it("/standards → auth", () => {
        const result = planProxy({
          pathname: "/standards",
          lockEnabled: true,
          reached: true,
        });
        expect(result).toEqual({ kind: "auth" });
      });

      it("/profile → auth", () => {
        const result = planProxy({
          pathname: "/profile",
          lockEnabled: true,
          reached: true,
        });
        expect(result).toEqual({ kind: "auth" });
      });
    });

    describe("other routes → pass (no lock, countdown reached)", () => {
      it("/kudos → pass", () => {
        const result = planProxy({
          pathname: "/kudos",
          lockEnabled: true,
          reached: true,
        });
        expect(result).toEqual({ kind: "pass" });
      });

      it("/khong-ton-tai → pass", () => {
        const result = planProxy({
          pathname: "/khong-ton-tai",
          lockEnabled: true,
          reached: true,
        });
        expect(result).toEqual({ kind: "pass" });
      });

      it("/auth/callback → pass (auth/* exempt)", () => {
        const result = planProxy({
          pathname: "/auth/callback",
          lockEnabled: true,
          reached: true,
        });
        expect(result).toEqual({ kind: "pass" });
      });

      it("/api/x → pass (api/* exempt)", () => {
        const result = planProxy({
          pathname: "/api/x",
          lockEnabled: true,
          reached: true,
        });
        expect(result).toEqual({ kind: "pass" });
      });

      it("/favicon.ico → pass (static file exempt)", () => {
        const result = planProxy({
          pathname: "/favicon.ico",
          lockEnabled: true,
          reached: true,
        });
        expect(result).toEqual({ kind: "pass" });
      });
    });
  });

  // ===== LOCK OFF, COUNTDOWN REACHED =====
  describe("lockEnabled = false, reached = true (lock OFF, countdown finished)", () => {
    describe("legacy whitelist → auth", () => {
      it("/ → auth", () => {
        const result = planProxy({
          pathname: "/",
          lockEnabled: false,
          reached: true,
        });
        expect(result).toEqual({ kind: "auth" });
      });

      it("/login → auth", () => {
        const result = planProxy({
          pathname: "/login",
          lockEnabled: false,
          reached: true,
        });
        expect(result).toEqual({ kind: "auth" });
      });
    });

    describe("other routes → pass", () => {
      it("/prelaunch → pass", () => {
        const result = planProxy({
          pathname: "/prelaunch",
          lockEnabled: false,
          reached: true,
        });
        expect(result).toEqual({ kind: "pass" });
      });

      it("/kudos → pass", () => {
        const result = planProxy({
          pathname: "/kudos",
          lockEnabled: false,
          reached: true,
        });
        expect(result).toEqual({ kind: "pass" });
      });
    });
  });

  // ===== EDGE CASES =====
  describe("edge cases", () => {
    it("_next/* routes are NOT matched by planProxy (filtered at config level)", () => {
      // Note: /_next/* is filtered out at middleware config level via matcher,
      // so planProxy never sees these. However, if someone does call it:
      // treat as pass (safe default).
      const result = planProxy({
        pathname: "/_next/static/test.js",
        lockEnabled: true,
        reached: false,
      });
      expect(result).toEqual({ kind: "pass" });
    });

    it("very deep /todo path → redirect while locked", () => {
      const result = planProxy({
        pathname: "/todo/2024/week1/list",
        lockEnabled: true,
        reached: false,
      });
      expect(result).toEqual({ kind: "redirect", to: "/prelaunch" });
    });

    it("very deep /todo path → auth once the lock is off", () => {
      const result = planProxy({
        pathname: "/todo/2024/week1/list",
        lockEnabled: false,
        reached: false,
      });
      expect(result).toEqual({ kind: "auth" });
    });

    it("/auth/sign-in → pass (auth/* exempt, no auth check)", () => {
      const result = planProxy({
        pathname: "/auth/sign-in",
        lockEnabled: true,
        reached: false,
      });
      expect(result).toEqual({ kind: "pass" });
    });

    it("/api/users/me → pass (api/* exempt)", () => {
      const result = planProxy({
        pathname: "/api/users/me",
        lockEnabled: true,
        reached: false,
      });
      expect(result).toEqual({ kind: "pass" });
    });

    it("/index.html → pass (file with extension, static)", () => {
      const result = planProxy({
        pathname: "/index.html",
        lockEnabled: true,
        reached: false,
      });
      expect(result).toEqual({ kind: "pass" });
    });

    it("/path/to/resource.pdf → pass (file with extension)", () => {
      const result = planProxy({
        pathname: "/path/to/resource.pdf",
        lockEnabled: true,
        reached: false,
      });
      expect(result).toEqual({ kind: "pass" });
    });
  });
});

// Guards the actual defect c57efb7 fixed. The e2e suite cannot reach it —
// playwright.config.ts pins the webServer env for the whole run, so no test can
// turn the lock on — and src/proxy.ts is outside every coverage glob. Without
// these cases a later "simplification" back to a bare NextResponse.redirect
// would silently restore the Server Action 404 with nothing red to show for it.
describe("redirectStatusFor — 303 for anything carrying a body", () => {
  it("GET keeps Next's default (undefined → 307)", () => {
    expect(redirectStatusFor("GET")).toBeUndefined();
  });

  it("HEAD keeps Next's default (undefined → 307)", () => {
    expect(redirectStatusFor("HEAD")).toBeUndefined();
  });

  it("POST gets 303 — a Server Action must not be re-POSTed to /prelaunch", () => {
    expect(redirectStatusFor("POST")).toBe(303);
  });

  it.each(["PUT", "PATCH", "DELETE", "OPTIONS"])(
    "%s gets 303 too",
    (method) => {
      expect(redirectStatusFor(method)).toBe(303);
    },
  );
});
