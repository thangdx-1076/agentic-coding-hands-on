"use server";

import { revalidatePath } from "next/cache";

import {
  validateKudoDraft,
  type KudoDraftErrors,
} from "../_utils/validate-kudo-draft";
import {
  validateKudoImages,
  type KudoImageRejectionReason,
} from "../_utils/validate-kudo-images";

import {
  removeKudoImages,
  toKudoStorageClient,
  uploadKudoImages,
  type UploadedKudoImages,
} from "./upload-kudo-images";

import { ROUTES } from "@/constants/routes";
import { createClient } from "@/lib/supabase/server";

/**
 * FormData contract read by this action (see `KudosComposeForm`, phase 13):
 *   - `recipientId`    string, receiver's `users.id`
 *   - `title`          string, "Danh hiệu" — becomes `hashtags[0]`
 *   - `content`        string
 *   - `hashtags`       repeated string field, the 1..5 hashtag CHIPS —
 *                      does NOT include the title; stored as
 *                      `hashtags[1..5]` in the DB row
 *   - `isAnonymous`    `"true"` to opt in, anything else treated as false
 *   - `anonymousName`  string, required when `isAnonymous` is `"true"`
 *   - `images`         repeated File field, 0..5 `.jpg`/`.png` files
 */

export type CreateKudoFieldErrors = KudoDraftErrors & {
  images?: KudoImageRejectionReason;
};

export type CreateKudoResult =
  | { ok: true; kudoId: string }
  | { ok: false; reason: "unauthenticated" }
  | { ok: false; reason: "validation"; fieldErrors: CreateKudoFieldErrors }
  | { ok: false; reason: "upload" }
  | { ok: false; reason: "error" };

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readStringList(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string");
}

/** `size > 0` guards against the empty placeholder `File` some browsers
 * submit for an unfilled slot of a multi-file input. */
function readImageFiles(formData: FormData): File[] {
  return formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

/** Mirrors `validateKudoDraft`'s own hashtag normalization (trim, drop
 * empties, de-dupe) — duplicated rather than imported because phase 04's
 * `validate-kudo-draft.ts` does not export that helper (it is private to
 * that module) and this file must not modify phase 04's files. Only ever
 * runs on input already confirmed valid by `validateKudoDraft` above, so
 * the result here always matches what was validated. */
function normalizeHashtagChips(chips: string[]): string[] {
  const trimmed = chips
    .filter((chip) => chip.trim() !== "")
    .map((chip) => chip.trim());
  return Array.from(new Set(trimmed));
}

/**
 * Server Action behind the "Viết Kudo" compose dialog's Gửi button
 * (F009_KudosCompose, A4). Re-derives the caller from the server session —
 * `sender_id` is ALWAYS `user.id`, never trusted from the client — and
 * fails closed with no session (FR-601/BR-006/gate A0), exactly like
 * `toggleKudoHeart` (`toggle-kudo-heart.ts`).
 *
 * Validates with the SAME modules the client uses (AD-8) so a direct call
 * that bypasses the compose form can never write an invalid or oversized
 * Kudo. Uploads every image to Storage BEFORE inserting the `kudos` row
 * (AD-5): an upload failure never reaches `.insert`, and an insert failure
 * that happens after a successful upload best-effort removes the now
 * orphaned objects — a `kudos` row missing one of its images is never
 * written.
 */
export async function createKudo(
  formData: FormData,
): Promise<CreateKudoResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, reason: "unauthenticated" };
    }

    const recipientId = readString(formData, "recipientId");
    const title = readString(formData, "title");
    const content = readString(formData, "content");
    const hashtagChips = readStringList(formData, "hashtags");
    const isAnonymous = formData.get("isAnonymous") === "true";
    const anonymousName = readString(formData, "anonymousName");
    const files = readImageFiles(formData);

    const fieldErrors: CreateKudoFieldErrors = validateKudoDraft({
      recipientId,
      title,
      content,
      hashtags: hashtagChips,
      isAnonymous,
      anonymousName,
    });

    const imageValidation = validateKudoImages(files);
    if (imageValidation.rejected.length > 0) {
      fieldErrors.images = imageValidation.rejected[0].reason;
    }

    if (Object.keys(fieldErrors).length > 0) {
      return { ok: false, reason: "validation", fieldErrors };
    }

    const storageClient = toKudoStorageClient(supabase);

    let uploaded: UploadedKudoImages;
    try {
      uploaded = await uploadKudoImages(storageClient, user.id, files);
    } catch {
      return { ok: false, reason: "upload" };
    }

    const kudoId = crypto.randomUUID();
    const { error: insertError } = await supabase.from("kudos").insert({
      id: kudoId,
      sender_id: user.id,
      receiver_id: recipientId,
      content: content.trim(),
      hashtags: [title.trim(), ...normalizeHashtagChips(hashtagChips)],
      image_urls: uploaded.urls,
      is_anonymous: isAnonymous,
      anonymous_name: isAnonymous ? anonymousName.trim() : null,
    });

    if (insertError) {
      await removeKudoImages(storageClient, uploaded.uploadedPaths);
      return { ok: false, reason: "error" };
    }

    revalidatePath(ROUTES.KUDOS);
    return { ok: true, kudoId };
  } catch {
    return { ok: false, reason: "error" };
  }
}
