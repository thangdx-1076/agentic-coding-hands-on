import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Root route. `proxy.ts` already redirects `/` based on auth state
 * (§ E2E contract) — this page is the AUTHORITATIVE fallback for cases
 * where the proxy's matcher doesn't run (e.g. direct server-side render
 * paths), per clarifications "Route `/`". It never itself renders UI.
 */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/todo" : "/login");
}
