/**
 * Validates the Image field's picked files against BR-003/FR-206/FR-404
 * (max 5 files, `.jpg`/`.jpeg`/`.png` only, one size cap per file). Shaped
 * on `{ name, type, size }` — exactly what a browser `File` and a `File`
 * pulled back out of a Server Action's `FormData` both expose — so this
 * one module runs on both sides of AD-8's "one validate module" split
 * without any DOM type (`File`, `Blob`) leaking into its signature.
 *
 * `MAX_KUDO_IMAGE_BYTES` is exported so `create-kudo.ts` (upload, phase
 * 06) and the Image field UI (phase 12) read the exact same 5 MiB number
 * decided at AD-4, instead of two copies quietly drifting apart.
 */

export type KudoImageLike = {
  name: string;
  type: string;
  size: number;
};

export type KudoImageRejectionReason = "invalidType" | "tooMany" | "tooLarge";

export type KudoImageRejection = {
  file: KudoImageLike;
  reason: KudoImageRejectionReason;
};

export type KudoImageValidationResult = {
  accepted: KudoImageLike[];
  rejected: KudoImageRejection[];
};

/** Sun* Annual Awards asks for `.jpg`/`.png` only (BR-003) — `.jpeg` is
 * accepted alongside `.jpg` since it is the same format under a longer,
 * equally common extension. */
export const MAX_KUDO_IMAGES = 5;

/** 5 MiB per file (AD-4) — chosen against Next 16.3.4's Server Action
 * `bodySizeLimit`, which the phase 06 action's `next.config.ts` change
 * must independently confirm against `node_modules/next/dist/docs/`. */
export const MAX_KUDO_IMAGE_BYTES = 5 * 1024 * 1024;

const ACCEPTED_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png"];

function hasAcceptedExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

/** Both the MIME type AND the extension must be on the allow-list — two
 * independent checks, not a cross-matched pair, per the spec's literal
 * "MIME ∈ {jpeg,png}, also check extension" wording. A browser can lie
 * about either one alone (a renamed file, a spoofed `Content-Type`); this
 * is still only the first line of defense — real content sniffing, if
 * ever needed, belongs to the upload step, not this pure function. */
function isAcceptedFormat(file: KudoImageLike): boolean {
  return ACCEPTED_MIME_TYPES.has(file.type) && hasAcceptedExtension(file.name);
}

/**
 * Runs every file through format → size → count, in that order, so a file
 * that is ALSO malformed at the 6th position is reported as `invalidType`
 * rather than `tooMany` — an invalid file should never consume one of the
 * 5 slots, regardless of where it sits in the picked list (this is why
 * `tooMany` compares against `accepted.length`, not the file's index).
 */
export function validateKudoImages(
  files: KudoImageLike[],
): KudoImageValidationResult {
  const accepted: KudoImageLike[] = [];
  const rejected: KudoImageRejection[] = [];

  for (const file of files) {
    if (!isAcceptedFormat(file)) {
      rejected.push({ file, reason: "invalidType" });
      continue;
    }
    if (file.size > MAX_KUDO_IMAGE_BYTES) {
      rejected.push({ file, reason: "tooLarge" });
      continue;
    }
    if (accepted.length >= MAX_KUDO_IMAGES) {
      rejected.push({ file, reason: "tooMany" });
      continue;
    }
    accepted.push(file);
  }

  return { accepted, rejected };
}
