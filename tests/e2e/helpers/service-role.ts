import { execFileSync } from "child_process";

/**
 * Resolves the local Supabase service-role key for `@local-db` cleanup.
 *
 * Why this exists: cleanup used to depend on the runner having exported
 * `SUPABASE_SERVICE_ROLE_KEY` by hand. Nobody did, so every `afterEach`
 * took its "missing key" branch and left its rows behind — measured
 * 2026-09-09 at 2 499 test users, 412 kudos and 88 secret-box openings
 * against a seed of 12, which is what finally broke `kudos.spec` C19
 * (it asserts a single scroll reaches the end of a seed-sized feed).
 *
 * So the key is now DERIVED rather than required: env first, then the
 * local CLI, which prints it from the running stack.
 *
 * Only a SUCCESS is memoized. Caching the failure too would recreate this
 * bug in a new shape: one transient `supabase status` miss — Docker still
 * coming up, a cold CLI start — would pin the whole worker to the "no key"
 * branch for the rest of the run, and the only trace would be a warn line
 * per test in a long log. Retrying costs ~1s on a path that is local-only
 * anyway (CI excludes the `@local-db` tier entirely), which is a much
 * better trade than silently stopping cleanup again.
 */
let cached: string | undefined;

export function getServiceRoleKey(): string | null {
  if (cached !== undefined) {
    return cached;
  }

  const fromEnv =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  if (fromEnv) {
    cached = fromEnv;
    return cached;
  }

  try {
    // argv array, no shell — nothing here is interpolated from test input.
    const out = execFileSync("npx", ["supabase", "status", "-o", "env"], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf-8",
    });
    const line = out.split("\n").find((l) => l.startsWith("SERVICE_ROLE_KEY="));
    const key = line
      ? line.slice("SERVICE_ROLE_KEY=".length).trim().replace(/^"|"$/g, "")
      : "";
    if (key) {
      cached = key;
      return cached;
    }
  } catch {
    // Fall through — deliberately NOT cached, see the docblock.
  }

  return null;
}

/** Base URL of the local Supabase REST/auth API. */
export function getSupabaseUrl(): string {
  return process.env.SUPABASE_URL || "http://127.0.0.1:55321";
}

/** Bucket the compose flow uploads kudo images into (`0010_kudo_images_bucket`). */
const KUDO_IMAGES_BUCKET = "kudo-images";

/**
 * Removes the user's uploaded images. `upload-kudo-images` namespaces every
 * object as `<userId>/<uuid>.<ext>`, so the user id is a clean prefix.
 *
 * Deleting the DB rows is not enough and the row count hides it: storage
 * objects live in `storage.objects`, nothing cascades to them from
 * `auth.users`, and the first version of this helper left 100 orphaned
 * objects behind while `users` and `kudos` both looked clean.
 */
async function deleteUserImages(
  url: string,
  headers: Record<string, string>,
  userId: string,
): Promise<void> {
  try {
    const listed = await fetch(
      `${url}/storage/v1/object/list/${KUDO_IMAGES_BUCKET}`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ prefix: userId, limit: 1000 }),
      },
    );
    if (!listed.ok) {
      console.warn(
        `[cleanup] listing ${KUDO_IMAGES_BUCKET}/${userId} returned ${listed.status}`,
      );
      return;
    }

    const objects = (await listed.json()) as { name: string }[];
    if (!Array.isArray(objects) || objects.length === 0) {
      return;
    }

    const removed = await fetch(
      `${url}/storage/v1/object/${KUDO_IMAGES_BUCKET}`,
      {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          prefixes: objects.map((o) => `${userId}/${o.name}`),
        }),
      },
    );
    if (!removed.ok) {
      console.warn(
        `[cleanup] deleting ${objects.length} object(s) under ${userId}/ returned ${removed.status}`,
      );
    }
  } catch (error) {
    console.warn(`[cleanup] image cleanup for ${userId} failed:`, error);
  }
}

/**
 * Deletes one test user and everything hanging off them, using the service
 * role. Best-effort by design — a failed cleanup must never turn a passing
 * assertion red — but it reports what went wrong instead of swallowing it,
 * because a silent no-op is exactly how the pile above accumulated.
 */
export async function deleteTestUser(userId: string): Promise<void> {
  const key = getServiceRoleKey();
  if (!key) {
    console.warn(
      `[cleanup] no service-role key (env or \`supabase status\`) — test user ${userId} left in the local DB`,
    );
    return;
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const url = getSupabaseUrl();

  // Storage is the one thing that does NOT come away with the user, so it
  // has to go first and by hand: `storage.objects` carries no foreign key to
  // `auth.users` (`0010_kudo_images_bucket`), which is how 100 orphaned
  // objects survived a cleanup that left `users` and `kudos` looking spotless.
  await deleteUserImages(url, headers, userId);

  // Everything else needs no help. The chain cascades the whole way down —
  // `public.users.id -> auth.users` ON DELETE CASCADE (`0001_users_table`),
  // then `kudos.sender_id`/`receiver_id`, `kudo_hearts.user_id` and
  // `secret_box_openings.user_id` all -> `public.users` ON DELETE CASCADE
  // (`0006`, `0007`, `0011`). Verified against pg_constraint, not assumed.
  // An earlier version deleted those four tables by hand first, on the
  // backwards theory that removing the user would strand them.
  try {
    const res = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers,
    });
    if (!res.ok) {
      console.warn(
        `[cleanup] admin delete of ${userId} returned ${res.status} — user left behind`,
      );
    }
  } catch (error) {
    console.warn(`[cleanup] admin delete of ${userId} failed:`, error);
  }
}
