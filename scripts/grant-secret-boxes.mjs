/**
 * Dev-only: give one Sunner unopened Secret Boxes again, so the feature can
 * be demoed more than once.
 *
 * Migration 0023 seeds entitlement, but a migration runs ONCE — after you
 * open the boxes it hands out, `secret_box_openings` catches up with your
 * entitlement and the button goes back to disabled. This script is the
 * repeatable half of that story.
 *
 *   node scripts/grant-secret-boxes.mjs <email> [boxes]   # default: 1 box
 *
 * What it does, in order:
 *   1. Deletes that Sunner's `secret_box_openings` rows. That alone restores
 *      every box they had already earned, because unopened is always
 *      recomputed as (entitlement - opened) — nothing is stored. This is the
 *      cheap path and it adds no rows to the feed.
 *   2. Only if step 1 still leaves them short of `boxes`, it earns more the
 *      way the app does: a new kudo from them, then 5 hearts on it from
 *      demo Sunner. 5 is HEARTS_PER_SECRET_BOX, so each one is exactly one
 *      box. `heart_count` is never written directly — the 0007 trigger owns
 *      that column, same rule 0008/0023 follow.
 *
 * Writes through PostgREST with SERVICE_ROLE_KEY (bypasses RLS, which has no
 * write path for hearts on someone else's behalf), mirroring how
 * `tests/e2e/helpers` seed their fixtures. Point it at a local Supabase —
 * it fabricates engagement, which is fine for a demo DB and not for a real
 * one.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEMO_EMAIL_PATTERN = "%@kudos-demo.saa";
const HEARTS_PER_SECRET_BOX = 5;

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  const out = {};
  let content;
  try {
    content = readFileSync(path, "utf-8");
  } catch {
    return out;
  }
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

const env = { ...loadEnvLocal(), ...process.env };
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  fail(
    "NEXT_PUBLIC_SUPABASE_URL and SERVICE_ROLE_KEY must be set (.env.local or env).",
  );
}

const [emailArg, boxesArg] = process.argv.slice(2);
if (!emailArg) {
  fail("Usage: node scripts/grant-secret-boxes.mjs <email> [boxes]");
}
const wantedBoxes = Number(boxesArg ?? "1");
if (!Number.isInteger(wantedBoxes) || wantedBoxes < 1) {
  fail(`boxes must be a positive integer, got "${boxesArg}"`);
}

/** Every call throws on a non-2xx — a half-applied seed is worse than none. */
async function rest(path, init = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      ...(init.headers ?? {}),
    },
  });
  const body = await response.text();
  if (!response.ok) {
    fail(
      `${init.method ?? "GET"} ${path} → ${response.status} ${response.statusText}\n${body}`,
    );
  }
  // An insert without `Prefer: return=representation` answers 201 with an
  // EMPTY body, and a delete answers 204 — `response.json()` throws on both,
  // so the body is read as text first and only parsed when there is one.
  return body ? JSON.parse(body) : null;
}

async function entitlementOf(userId) {
  const kudos = await rest(`kudos?sender_id=eq.${userId}&select=heart_count`);
  const hearts = kudos.reduce((total, row) => total + row.heart_count, 0);
  return Math.floor(hearts / HEARTS_PER_SECRET_BOX);
}

const [user] = await rest(
  `users?email=eq.${encodeURIComponent(emailArg)}&select=id,full_name`,
);
if (!user) {
  fail(`No Sunner with email ${emailArg}`);
}

// The target is filtered out of the pool because nothing in the database
// stops a self-kudo — `kudos_insert_own` is an RLS policy, and SERVICE_ROLE
// bypasses RLS. Without this, pointing the script at a demo account would
// quietly write a kudo whose sender and receiver are the same Sunner, and a
// heart credited to its own sender.
const demoSunners = (
  await rest(
    `users?email=like.${encodeURIComponent(DEMO_EMAIL_PATTERN)}&select=id&order=email`,
  )
).filter((sunner) => sunner.id !== user.id);

if (demoSunners.length < HEARTS_PER_SECRET_BOX + 1) {
  fail(
    `Need ${HEARTS_PER_SECRET_BOX + 1} demo Sunner other than the target; found ${demoSunners.length}. Apply 0008_kudos_demo_seed.sql first.`,
  );
}

// Step 1 — replay what they already earned.
const opened = await rest(
  `secret_box_openings?user_id=eq.${user.id}&select=id`,
);
await rest(`secret_box_openings?user_id=eq.${user.id}`, { method: "DELETE" });

let entitlement = await entitlementOf(user.id);
console.log(
  `${user.full_name ?? emailArg}: cleared ${opened.length} opening(s), entitlement ${entitlement}`,
);

// Step 2 — earn the shortfall, one kudo (5 hearts) per missing box.
for (let issued = entitlement; issued < wantedBoxes; issued += 1) {
  // The one demo Sunner held back from the hearting group below, so nobody
  // ends up hearting a kudo addressed to themselves.
  const receiver = demoSunners[HEARTS_PER_SECRET_BOX];
  const [kudo] = await rest("kudos", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      sender_id: user.id,
      receiver_id: receiver.id,
      content: "Seeded so the Secret Box has something to open.",
    }),
  });

  await rest("kudo_hearts", {
    method: "POST",
    body: JSON.stringify(
      demoSunners
        .slice(0, HEARTS_PER_SECRET_BOX)
        .map((sunner) => ({ kudo_id: kudo.id, user_id: sunner.id })),
    ),
  });
}

entitlement = await entitlementOf(user.id);
console.log(
  `✓ ${user.full_name ?? emailArg} now has ${entitlement} unopened Secret Box(es). Reload /kudos.`,
);
