---
passed: true
issues: 0
warnings: 0
---

# Feature List Review — Wave 5.6 Sanity Check

## Passed Checks

✓ coverage_completeness
✓ orphan_codes
✓ fcode_uniqueness
✓ clear_flow
✓ vague_naming
✓ scope_overlap
✓ grouping_coherence

## Details

### Group A — Structural integrity

**1. Coverage completeness** — PASS. All 3 US### from `user-stories.md` referenced by ≥1 F###: US001→F002, US002→F001, US003→F001. Both SCR### from `screen-list.md`'s main index referenced: SCR001→F001+F002, SCR002→F001.

**2. Orphan codes** — PASS. Every US###/SCR### cited inside F001/F002 exists in its source artifact: US001-003 match `user-stories.md` User Story Index (line 29-31); SCR001/SCR002 match `screen-list.md` Screen Index (line 23-24). No fabricated codes, no stale `SCR###/REG###` composite refs (screens are atomic, no REG### exist, and feature-list.md correctly uses bare SCR### rather than inventing region suffixes).

**3. F-code uniqueness** — PASS. F001, F002 — no duplicate numbers.

### Group B — Quality

**5. Clear flow** — PASS.
- F001: Input (Google credential via OAuth) → Process (Supabase PKCE exchange, route-guard enforcement PERM001-004) → Output (session granted/revoked, redirect to `/todo` or `/login`). Identifiable I→P→O.
- F002: Input (locale pick in header selector) → Process (Server Action writes `NEXT_LOCALE` cookie) → Output (UI re-renders in chosen language). Identifiable I→P→O.

**6. Vague naming** — PASS. Neither name is a bare generic noun:
- F001 "Đăng nhập Google OAuth & Bảo vệ truy cập" carries specific qualifiers ("Google OAuth"), not "Management/System/Handler/Admin/CRUD" alone.
- F002 "Chuyển đổi ngôn ngữ giao diện (VN/EN)" is specific (locale switch, scoped to VN/EN).

**7. Scope overlap** — PASS. F001 (US002, US003) and F002 (US001) share zero US### — no keyword overlap. Both reference SCR001, but ownership is explicitly partitioned by region (F001 owns the screen shell minus the language-selector; F002 owns only the language-selector sub-region) — not a >50% keyword collision, a deliberately disjoint split of one shared screen.

### Group C — Grouping coherence

**8. Grouping coherence** — PASS, per `code-formats.md` § Feature Clustering Rule (authority).

**Multi-outcome name enumeration (exhaustive, both F###):**

- **F001** "Đăng nhập Google OAuth **&** Bảo vệ truy cập" — name contains `&`, qualifies for the multi-outcome look-twice bullet. Verdict: **single outcome, not SPLIT.** The artifact's justification block (feature-list.md lines 23) argues concretely, not just asserts: PERM001-004 test exactly one axis (`Authenticated` vs `Anonymous`, no RBAC/ownership/policy — confirmed by `permissions-matrix.md`'s own "no RBAC" ground-truth note cited there), and that axis is created by US002 (login) and torn down by US003 (logout). Applying the Rule's own test — "ONE primary business outcome that explains every US in it" — the outcome "khách vào và rời khu vực bảo vệ đúng đắn, có xác thực Google" explains both US002 and US003 and all 4 PERM###. This also tracks the Rule's explicit warning against forming a Feature "held together only by HOW it's implemented": here the grouping is held together by a shared business outcome (session lifecycle of one protected boundary), not by implementation mechanism, so it does not trip that guard either. Splitting login from the guard/logout would produce a guard-only Feature with no user-facing intent of its own (guard serves no actor beyond enforcing login state) — which is itself a Clustering Rule violation ("undeclared outcome... give it its own Feature" only applies when a distinct outcome exists; here none does). Conclusion: conjunction in the name is the author's own flagged self-check, correctly resolved to single-outcome, matches the corpus finding that most conjunction names are non-defects.
- **F002** "Chuyển đổi ngôn ngữ giao diện (VN/EN)" — no `&`/`and`/comma-joined outcome; the parenthetical `(VN/EN)` scopes the language set, it does not declare a second outcome. Does not qualify for enumeration.

No critical finding — this is a single Feature Clustering judgment call with a well-argued single-outcome resolution, not a case of "clearly mixed" concerns.

**Pinning note:** F001/F002 codes, slugs, names, priorities, and types were explicitly pinned by the orchestrator (promoted specs already exist at `docs/vi/features/F001_GoogleOAuthLogin/` and `F002_LanguageSwitch/`). Per review instructions, even had the partition looked wrong, that would be logged as a WARNING, not a blocking critical. As it stands, the partition itself reads as sound on its own merits (see above) — no warning raised.

## Unresolved Questions

None.
