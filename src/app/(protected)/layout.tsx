import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Single authoritative session gate for every route under `(protected)`
 * (currently `/todo` only). Runs a REAL `supabase.auth.getUser()` — never a
 * cookie read — and redirects to `/login` when no user is present, before
 * any child page renders. `src/proxy.ts`'s matcher stays an optimistic
 * pre-check only; this layout is the enforcement point.
 *
 * `LayoutProps<"/">` (the generated route-typed prop) is unavailable in this
 * session because it depends on `.next/types`, which only `pnpm build`
 * regenerates — falls back to the explicit `children` prop type per the
 * phase plan.
 */
export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <>{children}</>;
}
