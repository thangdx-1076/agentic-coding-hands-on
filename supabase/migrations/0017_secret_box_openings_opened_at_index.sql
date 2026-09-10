-- 0017 — index `secret_box_openings (opened_at DESC)`
--
-- Why: `public.recent_gift_recipients` (0015) is `ORDER BY s.opened_at DESC
-- LIMIT 10` over an append-only log, and it is read on `/kudos` — a PUBLIC
-- page, so every anonymous visitor pays for it. `0011` only indexed
-- `user_id` (for `open_secret_box()`'s own-row recompute and the own-row
-- SELECT policy), which does not help an ordered scan on `opened_at`.
--
-- Cost today is trivial (the table holds a handful of rows), so this is not
-- a fix for a live problem — it is the index the query shape asks for before
-- the log grows. Raised as a Low finding by the inspection pass on
-- 2026-09-10 (`plans/260910-1951-screen-audit-spec-test-gaps/evidence/inspection-verdict.json`).
--
-- `DESC` is written explicitly to match the view's ORDER BY. Postgres can
-- walk a plain ascending btree backwards just as cheaply, so this is about
-- keeping the declaration and the consumer legible side by side, not about
-- unlocking an optimisation the default ordering would miss.
--
-- Touches no policy, no grant and no column: `secret_box_openings` keeps the
-- own-row-only SELECT posture `0011` established, and `0015`'s view stays
-- the single deliberate exception to it.

CREATE INDEX IF NOT EXISTS idx_secret_box_openings_opened_at
    ON public.secret_box_openings (opened_at DESC);

COMMENT ON INDEX public.idx_secret_box_openings_opened_at IS
  'Serves public.recent_gift_recipients (0015): ORDER BY opened_at DESC LIMIT 10 on the public /kudos sidebar. Sibling of idx_secret_box_openings_user_id (0011), which serves the own-row read path instead.';
