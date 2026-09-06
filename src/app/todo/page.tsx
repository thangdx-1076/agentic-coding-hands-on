import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { logoutAction } from "./actions";

import { TodoScreen } from "@/components/todo/todo-screen";
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
    <TodoScreen
      greeting={t("greeting", { email: user.email ?? "" })}
      logoutLabel={t("logout")}
      logoutAction={logoutAction}
    />
  );
}
