-- 0013_notification_emitters.sql
--
-- Two `SECURITY DEFINER` `AFTER INSERT` triggers that are the ONLY writers of
-- `public.notifications` (F012_NotificationsPanel, phase 03 of this
-- feature's migration set). No `authenticated` INSERT grant exists on that
-- table (0012) — a notification is always a side effect of someone else's
-- action, never authored by its recipient.
--
-- DO NOT run `supabase db reset` on this project. `auth.users` holds real
-- sign-ins; a reset drops and rebuilds the database and loses every one of
-- them. Apply this file with `supabase migration up` only.
--
-- Scope, on purpose (plan.md phase-03, spec/F012_NotificationsPanel/
-- technical-spec.md § 3, clarifications.md § "Phạm vi 4 loại"):
--   * Trigger, not a server action. `create-kudo.ts` inserts exactly one row
--     with no transaction wrapping it — a second write at the app layer
--     would open a half-written window. `heart_count` already has a
--     precedent (`sync_kudo_heart_count()`, 0007) of being kept in sync by a
--     trigger that is the column's sole writer; emitting the notification in
--     the same place puts it in the SAME transaction as the event that
--     causes it.
--   * `emit_kudos_received()` RETURNs immediately, with no insert, when
--     `NEW.sender_id = NEW.receiver_id` (FR-402/EC001/BL02) — sending a kudo
--     to yourself never notifies you of your own kudo.
--   * `senderName` in the `kudos_received` payload is `NEW.anonymous_name`
--     when `NEW.is_anonymous`, otherwise the real `full_name` read from
--     `public.users`. When anonymous, the payload MUST NOT carry
--     `sender_id` or the real name (BL03/EC002) — this is the anonymity
--     boundary's easiest leak point, per technical-spec § 3.
--   * `emit_heart_received()` notifies the KUDO'S SENDER, not the
--     `kudo_hearts` row's own subject (the receiver of the kudo). This is
--     not a typo: `open_secret_box()` (0011) already credits hearts to
--     `kudos.sender_id` ("Hearts credit the kudo's SENDER"), and a
--     notification that instead followed `receiver_id` would report the
--     heart to one person while a different person is credited for it —
--     two definitions of "whose kudo this is" inside the same feature.
--     TC-013 checks this exact direction. Self-hearting (the kudo's own
--     sender hearting their own kudo) is impossible under
--     `kudo_hearts_insert_own`'s `WITH CHECK` (0007), but the guard is kept
--     here anyway as defense in depth, same FR-402 reasoning.
--   * FR-404 dedupe is the partial UNIQUE index from 0012
--     (`uq_notifications_heart_received_dedupe`), never `ON CONFLICT DO
--     NOTHING` — dropping and re-adding a heart are two separate
--     transactions with no row to conflict against in a single statement.
--     Hitting it is treated as success (`WHEN unique_violation THEN RETURN
--     NEW`), not failure. This branch MUST come before `WHEN OTHERS`: the
--     reverse order lets `OTHERS` swallow the unique-violation case first
--     and turns a correct dedupe into a spurious `RAISE WARNING`.
--   * No trigger exists on `kudo_hearts` DELETE — unhearting does not delete
--     the notification already sent (EC004); a Sunner keeps seeing that a
--     heart happened even after it is withdrawn.
--   * FR-405: any OTHER failure while writing the notification is caught by
--     `WHEN OTHERS`, logged with `RAISE WARNING`, and swallowed — the kudo
--     insert or the heart insert that triggered the emitter must still
--     succeed. A broken emitter must never roll back the user-visible
--     action that caused it.
--   * `SECURITY DEFINER` + `SET search_path = public, pg_temp` mirrors
--     `sync_kudo_heart_count()` (0007:99-104) exactly — `authenticated`
--     holds no INSERT grant on `notifications` (0012), and pinning
--     `search_path` closes the same privilege-escalation-via-hijacked-path
--     hole 0002/0007/0011 already guard against.
--   * Neither function accepts a parameter from the caller — both resolve
--     every value they need from `NEW` and from tables they read, never
--     from client input, so there is no injection surface to reason about.

-- `NEW.sender_id = NEW.receiver_id` short-circuits self-kudos before any
-- lookup or insert runs (FR-402/EC001/BL02).
CREATE OR REPLACE FUNCTION public.emit_kudos_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sender_name text;
BEGIN
  IF NEW.sender_id = NEW.receiver_id THEN
    RETURN NEW;
  END IF;

  BEGIN
    -- Anonymity boundary: the real name is read only when NOT anonymous.
    -- When anonymous, `anonymous_name` is the only name this payload may
    -- ever carry — `sender_id` never appears in it at all (BL03/EC002).
    IF NEW.is_anonymous THEN
      v_sender_name := NEW.anonymous_name;
    ELSE
      SELECT full_name INTO v_sender_name
        FROM public.users
       WHERE id = NEW.sender_id;
    END IF;

    INSERT INTO public.notifications (user_id, type, payload)
    VALUES (
      NEW.receiver_id,
      'kudos_received',
      jsonb_build_object('kudosId', NEW.id, 'senderName', v_sender_name)
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- FR-405: emit failing must never roll back the kudo insert that
      -- caused it. Kudos already succeeded by the time this trigger runs;
      -- swallow and just make noise in the log.
      RAISE WARNING 'emit_kudos_received failed for kudo %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.emit_kudos_received IS
  'AFTER INSERT trigger on public.kudos. SECURITY DEFINER because authenticated holds no INSERT grant on notifications (0012) — this is the only writer. Runs as a trigger, not a server action, because create-kudo.ts inserts its one row with no transaction; a second app-layer write would open a half-written window (see file header). Self-kudos (sender_id = receiver_id) returns immediately with no row written (FR-402). senderName is anonymous_name when is_anonymous, otherwise the real full_name — sender_id and the real name must never reach the payload on an anonymous kudo (BL03/EC002). Any failure while writing the notification is caught and RAISE WARNING''d, never propagated — the kudos insert this trigger fires from must always succeed regardless of this function''s outcome (FR-405).';

DROP TRIGGER IF EXISTS on_kudos_emit_received ON public.kudos;
CREATE TRIGGER on_kudos_emit_received
    AFTER INSERT ON public.kudos
    FOR EACH ROW
    EXECUTE FUNCTION public.emit_kudos_received();

-- Notifies the kudo's SENDER (the person credited for the heart by
-- open_secret_box(), 0011), not the kudo_hearts row's own user_id.
CREATE OR REPLACE FUNCTION public.emit_heart_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_kudo_sender_id uuid;
  v_actor_name     text;
BEGIN
  SELECT sender_id INTO v_kudo_sender_id
    FROM public.kudos
   WHERE id = NEW.kudo_id;

  -- Self-heart guard (defense in depth — kudo_hearts_insert_own's WITH
  -- CHECK in 0007 already forbids a sender hearting their own kudo, but the
  -- notification path must not assume the write path is the only caller).
  IF v_kudo_sender_id IS NULL OR v_kudo_sender_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT full_name INTO v_actor_name
      FROM public.users
     WHERE id = NEW.user_id;

    INSERT INTO public.notifications (user_id, type, payload)
    VALUES (
      v_kudo_sender_id,
      'heart_received',
      jsonb_build_object(
        'kudosId', NEW.kudo_id,
        'actorId', NEW.user_id,
        'actorName', v_actor_name
      )
    );
  EXCEPTION
    WHEN unique_violation THEN
      -- FR-404: hitting uq_notifications_heart_received_dedupe (0012) means
      -- this exact (recipient, kudos, actor) heart_received row already
      -- exists — unheart-then-reheart collapsing to one row is the correct
      -- outcome, not an error. MUST be caught before WHEN OTHERS below, or
      -- OTHERS swallows it first and this dedupe becomes a spurious
      -- WARNING (see file header).
      RETURN NEW;
    WHEN OTHERS THEN
      -- FR-405: emit failing must never roll back the heart insert that
      -- caused it.
      RAISE WARNING 'emit_heart_received failed for kudo % / user %: %', NEW.kudo_id, NEW.user_id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.emit_heart_received IS
  'AFTER INSERT trigger on public.kudo_hearts. SECURITY DEFINER because authenticated holds no INSERT grant on notifications (0012). Notifies kudos.sender_id (the SENDER of the kudo that was hearted), never the kudo_hearts row''s own user_id or the kudo''s receiver_id — open_secret_box() (0011) already credits hearts to the sender ("Hearts credit the kudo''s SENDER"), and a notification that instead followed receiver_id would report the heart to one person while crediting a different one. Self-hearting (kudo_sender = actor) returns with no row written; kudo_hearts_insert_own (0007) already forbids this at the write path, this is defense in depth. Hitting uq_notifications_heart_received_dedupe (0012) is caught as WHEN unique_violation and treated as success (FR-404) — checked BEFORE WHEN OTHERS, which instead RAISE WARNINGs and swallows any other failure without rolling back the heart insert (FR-405). No trigger exists on kudo_hearts DELETE by design — unhearting does not delete a notification already sent (EC004).';

DROP TRIGGER IF EXISTS on_kudo_heart_emit_received ON public.kudo_hearts;
CREATE TRIGGER on_kudo_heart_emit_received
    AFTER INSERT ON public.kudo_hearts
    FOR EACH ROW
    EXECUTE FUNCTION public.emit_heart_received();

-- Rollback (manual — no down-migration runner in this project):
--
-- DROP TRIGGER IF EXISTS on_kudos_emit_received ON public.kudos;
-- DROP TRIGGER IF EXISTS on_kudo_heart_emit_received ON public.kudo_hearts;
-- DROP FUNCTION IF EXISTS public.emit_kudos_received();
-- DROP FUNCTION IF EXISTS public.emit_heart_received();
--
-- Notifications already emitted are left in place on rollback — deleting
-- them would destroy user-visible history for no correctness reason.
