import { getTranslations } from "next-intl/server";

import { logoutAction } from "../../_actions/logout";

import { TodoScreen } from "./_components/todo-screen";

import { getCurrentUser } from "@/dal/auth";

/**
 * Protected `/todo` placeholder (FR-301/FR-302/FR-603/US004). No todo
 * feature is implemented here per clarifications — this page exists
 * solely to prove the auth guard end-to-end: greet the signed-in user's
 * email and offer logout.
 *
 * The AUTHORITATIVE session gate now lives in `(protected)/layout.tsx`: an
 * anonymous visitor is redirected to `/login` before this page ever
 * renders. `getCurrentUser()` here is kept only to read the email for the
 * greeting — an accepted extra GoTrue round-trip through `src/dal/auth.ts`
 * (four consumers is past YAGNI for introducing the session helper).
 */
export default async function TodoPage() {
  const user = await getCurrentUser();

  const t = await getTranslations("todo");

  return (
    <TodoScreen
      greeting={t("greeting", { email: user?.email ?? "" })}
      logoutLabel={t("logout")}
      logoutAction={logoutAction}
    />
  );
}
