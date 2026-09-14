/**
 * Every path used by links, redirects and (indirectly) the proxy matcher.
 * `as const` keeps each value a string literal, not a widened `string` —
 * required for `href={ROUTES.LOGIN}` to satisfy Next's typed routes.
 *
 * `src/proxy.ts`'s `config.matcher` does NOT read this table: Next
 * statically analyzes `matcher` at build time, so it must stay a literal
 * array there. This file only replaces inline route strings in redirects,
 * links and defaults.
 */
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  TODO: "/todo",
  AUTH_CALLBACK: "/auth/callback",
  AWARDS: "/awards",
  STANDARDS: "/standards",
  KUDOS: "/kudos",
  PROFILE: "/profile",
  PRELAUNCH: "/prelaunch",
} as const;

/**
 * `/kudos?secretbox=open` opens the Secret Box dialog on arrival.
 *
 * Lives here, beside `ROUTES`, because BOTH route groups need the same
 * spelling: `(protected)/profile` writes it into a link and `(public)/kudos`
 * reads it. Declaring it inside either one would make the other's import a
 * sideways reach into a private `_components` folder.
 */
export const SECRET_BOX_OPEN_PARAM = "secretbox";
