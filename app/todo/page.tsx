import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { logoutAction } from "./actions";

import { createClient } from "@/lib/supabase/server";

/**
 * Protected `/todo` placeholder (FR-301/FR-302/FR-603/US004). No todo
 * feature is implemented here per clarifications — this page exists
 * solely to prove the auth guard end-to-end: greet the signed-in user's
 * email and offer logout.
 *
 * `getUser()` is the AUTHORITATIVE check (unlike `proxy.ts`'s optimistic
 * one) — it re-validates the session server-side on every request rather
 * than trusting the proxy's earlier pass, so a stale/forged cookie can
 * never reach this render.
 */
export default async function TodoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const t = await getTranslations("todo");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">
        {t("greeting", { email: user.email ?? "" })}
      </h1>
      <form action={logoutAction}>
        <button
          type="submit"
          className="rounded-full bg-foreground px-5 py-2 text-background"
        >
          {t("logout")}
        </button>
      </form>
    </main>
  );
}
