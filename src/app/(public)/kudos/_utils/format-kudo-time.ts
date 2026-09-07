/**
 * Renders a kudo's `created_at` ISO timestamp as the fixed
 * `HH:mm - MM/DD/YYYY` display string the design uses everywhere on this
 * screen (`mms_C.3.4_Time`, e.g. `"10:00 - 10/30/2025"`) — always that
 * literal field order (US month/day, not the reverse), never the
 * visitor's locale.
 *
 * `toLocaleString`/`Intl` is deliberately never used here: its output
 * depends on the runtime's locale/ICU data, so the exact same build can
 * render two different strings on a dev machine and in CI. Every field
 * below is read with a `getUTC*` accessor for the same reason — this
 * function's output must not depend on the host process's `TZ` either.
 */
export function formatKudoTime(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const year = date.getUTCFullYear();

  return `${hours}:${minutes} - ${month}/${day}/${year}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
