import { redirect } from "next/navigation";

import { getCurrentUser } from "@/dal/auth";
import { ROUTES } from "@/constants/routes";

/**
 * Single authoritative session gate for every route under `(protected)`
 * (currently `/todo` only). Runs a REAL GoTrue session read via
 * `src/dal/auth.ts`'s `getCurrentUser()` — never a cookie read — and
 * redirects to `/login` when no user is present, before any child page
 * renders. `src/proxy.ts`'s matcher stays an optimistic pre-check only;
 * this layout is the enforcement point.
 *
 * `LayoutProps<"/">` (the generated route-typed prop) is unavailable in this
 * session because it depends on `.next/types`, which only `pnpm build`
 * regenerates — falls back to the explicit `children` prop type per the
 * phase plan.
 */
export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  return <>{children}</>;
}
