/**
 * Which status a redirect should carry, given the method of the request being
 * redirected. Pure HTTP semantics — nothing in here knows what the redirect is
 * for.
 *
 * 307 (`NextResponse.redirect`'s default) preserves the method. Every page in
 * this app reaches a Server Action as a POST to its own route, so a guard that
 * 307s a POST re-POSTs that action to the redirect target, which has no action
 * of that id and answers 404 with `x-nextjs-action-not-found` instead of the
 * page (measured against a real server, not assumed). 303 is exactly the
 * "never mind, go read this other resource with a GET" status that case wants.
 *
 * `undefined` means "leave Next's default alone" — GET and HEAD carry no body
 * to re-send, so 307 stays correct for them.
 */
export function redirectStatusFor(method: string): 303 | undefined {
  const isBodylessRead = method === "GET" || method === "HEAD";
  return isBodylessRead ? undefined : 303;
}
