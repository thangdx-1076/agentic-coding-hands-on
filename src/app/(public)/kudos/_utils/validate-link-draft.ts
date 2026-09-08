/**
 * Validates the "Thêm đường dẫn" dialog's 2-field draft (A5, BR-007,
 * BR-008, clarifications.md § "Rule validate?"). Runs entirely client-side
 * — there is no server round-trip for this dialog (A5's own **BE** row is
 * "không có") — the result only ever feeds `insertMarkdownMarker` inside
 * the same tab.
 *
 * Unlike `validate-kudo-draft.ts`'s bag of generic `KudoDraftErrorCode`s
 * looked up later against `messages/*.json`, the values returned here ARE
 * the exact `kudos.composeModal.linkDialog.*` key names
 * (`LinkDraftErrorKey`) — this dialog has only 2 fields and each error
 * message is already field-specific, so there is no shared code to
 * de-duplicate through an extra lookup layer (YAGNI over that precedent).
 *
 * `validateLinkUrl` is exported standalone because the URL field validates
 * twice on two different triggers (clarifications.md § "Validate khi
 * nào?"): once alone on blur, and again as part of the full draft when
 * "Lưu" is clicked — `validateLinkDraft` calls the very same function so
 * the two triggers can never disagree.
 */

export type LinkDraftErrorKey =
  "errorRequired" | "errorTextTooLong" | "errorUrlInvalid" | "errorUrlLength";

export type LinkDraftErrors = {
  text?: LinkDraftErrorKey;
  url?: LinkDraftErrorKey;
};

export type LinkDraft = {
  text: string;
  url: string;
};

const MAX_TEXT_LENGTH = 100;
const MIN_URL_LENGTH = 5;
const MAX_URL_LENGTH = 2048;
const ALLOWED_URL_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * BR-007 — required, and the 100-char cap counts the ORIGINAL string
 * (clarifications.md's own row does not say to trim before counting, and
 * the `L06` DOM contract fills exactly 101/100 raw `a` characters with no
 * surrounding whitespace to strip) — only the "is it empty" check trims.
 */
function validateLinkText(text: string): LinkDraftErrorKey | undefined {
  if (text.trim() === "") {
    return "errorRequired";
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return "errorTextTooLong";
  }
  return undefined;
}

/**
 * BR-008 — required, 5-2048 chars after `trim()`, must `new URL()` parse
 * and its protocol must be in the http/https allowlist. Order matters:
 * the length gate runs BEFORE `new URL()` so a too-short string like
 * `"www"` reports `errorUrlLength` rather than `errorUrlInvalid` — same
 * precedence the dialog's own error copy implies (length is checked
 * first in clarifications.md's rule list). `new URL()` alone is NOT
 * sufficient (research report § 6): it happily parses `javascript:`,
 * `data:`, `file:` — the protocol allowlist below is load-bearing, not
 * redundant.
 */
export function validateLinkUrl(url: string): LinkDraftErrorKey | undefined {
  const trimmed = url.trim();
  if (trimmed === "") {
    return "errorRequired";
  }
  if (trimmed.length < MIN_URL_LENGTH || trimmed.length > MAX_URL_LENGTH) {
    return "errorUrlLength";
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return "errorUrlInvalid";
  }

  if (!ALLOWED_URL_PROTOCOLS.has(parsed.protocol)) {
    return "errorUrlInvalid";
  }

  return undefined;
}

/**
 * Checks both fields independently (like `validateKudoDraft`) so "Lưu"
 * can surface both errors at once when both are invalid (L04's DOM
 * contract: empty text AND empty url both visible from one click).
 */
export function validateLinkDraft(draft: LinkDraft): LinkDraftErrors {
  const errors: LinkDraftErrors = {};

  const textError = validateLinkText(draft.text);
  if (textError) {
    errors.text = textError;
  }

  const urlError = validateLinkUrl(draft.url);
  if (urlError) {
    errors.url = urlError;
  }

  return errors;
}
