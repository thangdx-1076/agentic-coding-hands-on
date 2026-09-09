import { getServiceRoleKey, getSupabaseUrl } from "./helpers/service-role";

/**
 * Removes notification rows that the F012 emitter triggers leave on SEED
 * users after a run.
 *
 * Why the per-test cleanup cannot cover this: `deleteTestUser` relies on
 * `notifications.user_id -> public.users ON DELETE CASCADE`, which only
 * fires for users the run actually deletes. But `emit_heart_received`
 * notifies the kudo's SENDER, and several existing specs heart a kudo from
 * the demo seed (`0008_kudos_demo_seed.sql`). That sender is never deleted,
 * so its notification survives every cleanup and the table grows by a row
 * or two per full local run — measured at 1 row after the first run that
 * had the trigger installed.
 *
 * Small, but this is the exact shape of the leak that reached 2 499 test
 * users before anyone noticed (see `helpers/service-role.ts`'s docblock):
 * it starts at one row a run and is invisible until a count-sensitive test
 * breaks.
 *
 * Scoped to `@kudos-demo.saa` on purpose — it clears what the suite dirtied
 * on seed data and leaves real sign-ins alone.
 */
async function globalTeardown(): Promise<void> {
  const key = getServiceRoleKey();
  if (!key) {
    // Local-only tier; CI excludes `@local-db` entirely. No key means the
    // stack is not running, so there is nothing to clean.
    return;
  }

  const url = getSupabaseUrl();
  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  const seedUsers = await fetch(
    `${url}/rest/v1/users?email=like.*@kudos-demo.saa&select=id`,
    { headers },
  );
  if (!seedUsers.ok) {
    throw new Error(
      `global teardown: không đọc được user demo: ${seedUsers.status} ${await seedUsers.text()}`,
    );
  }

  const ids = ((await seedUsers.json()) as Array<{ id: string }>).map(
    (row) => row.id,
  );
  if (ids.length === 0) {
    return;
  }

  const deleted = await fetch(
    `${url}/rest/v1/notifications?user_id=in.(${ids.join(",")})`,
    { method: "DELETE", headers },
  );
  if (!deleted.ok) {
    // Throw rather than warn. A teardown that swallows its own failure is
    // how the previous leak stayed invisible for weeks.
    throw new Error(
      `global teardown: không xoá được notification của user demo: ${deleted.status} ${await deleted.text()}`,
    );
  }
}

export default globalTeardown;
