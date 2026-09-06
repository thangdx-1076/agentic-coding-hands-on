import { execFileSync } from "child_process";
import * as os from "os";
import * as path from "path";

/**
 * Promote a test user to admin role in the Supabase local instance.
 * Runs `supabase db query` to directly update the user role in the database.
 *
 * @param email The email of the user to promote (must exist in auth)
 * @throws if the query fails
 */
export function promoteToAdmin(email: string): void {
  const saaAppDir =
    process.env.SAA_APP_DIR ??
    path.join(os.homedir(), "Desktop/Claude-and-mormoph/saa-app");

  // Escape single quotes in email for SQL
  const escapedEmail = email.replace(/'/g, "''");

  const query = `update public.users set role='admin' where email='${escapedEmail}'`;

  try {
    // `execFileSync` with an argv array: the SQL never passes through a shell,
    // so no command-injection surface even if a caller ever fed it external
    // input (the email is SQL-escaped above; the shell layer is simply gone).
    execFileSync("supabase", ["db", "query", query], {
      cwd: saaAppDir,
      stdio: "pipe",
      encoding: "utf-8",
    });
  } catch (error) {
    const err = error as { stderr?: string; stdout?: string; message?: string };
    throw new Error(
      `Failed to promote ${email} to admin: ${err.stderr || err.message || "unknown error"}`,
    );
  }
}
