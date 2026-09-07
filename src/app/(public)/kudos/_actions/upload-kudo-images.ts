import "server-only";

import type { createClient } from "@/lib/supabase/server";

/**
 * Uploads already-validated Kudo images to the Supabase Storage bucket
 * `kudo-images` (AD-4/AD-5, INT-001) and returns their public URLs, or
 * throws after best-effort cleanup when any file fails partway through.
 *
 * Sequential, not `Promise.all`: on failure at file k, only files
 * `0..k-1` are known to have landed, so their exact paths can be handed to
 * `removeKudoImages` before the original Supabase error is re-thrown
 * (AD-5 — never let a `kudos` row get inserted missing one of its
 * images). The client is always INJECTED by the caller (`create-kudo.ts`
 * passes the one client it already created for `auth.getUser()`/the
 * `kudos` insert) — same convention as every DAL read in this codebase,
 * no second client, no service-role key.
 *
 * Storage path is `${userId}/${randomUUID()}.${ext}`; `ext` is derived
 * from the file's MIME type, NEVER from the user-supplied filename (path
 * traversal / collision risk).
 */

export type UploadedKudoImages = {
  urls: string[];
  uploadedPaths: string[];
};

type KudoStorageUploadResult =
  { data: { path: string }; error: null } | { data: null; error: unknown };

type KudoStorageRemoveResult = { data: unknown; error: unknown };

/**
 * The minimal slice of a Supabase (or Supabase-shaped) client this module
 * touches — `.storage.from("kudo-images").upload/getPublicUrl/remove`.
 * Deliberately narrower than the full SDK client so this file's own test
 * can stub it without matching the entire Supabase surface (same pattern
 * as `src/dal/sunner-search.ts`'s `SunnerSearchClient`).
 */
export type KudoStorageClient = {
  storage: {
    from: (bucket: "kudo-images") => {
      upload: (
        path: string,
        file: File,
        options: { contentType: string },
      ) => Promise<KudoStorageUploadResult>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
      remove: (paths: string[]) => Promise<KudoStorageRemoveResult>;
    };
  };
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Narrows the real `@supabase/ssr` server client to the one slice this
 * module consumes. Re-issuing each call through explicitly typed arrows
 * (rather than passing the real client straight through) keeps the type
 * comparison shallow, mirroring `toSunnerSearchClient`
 * (`src/dal/sunner-search-client.ts`) — the same fix for the same
 * "structurally comparing the whole client is too deep" problem.
 */
export function toKudoStorageClient(
  supabase: SupabaseServerClient,
): KudoStorageClient {
  return {
    storage: {
      from: (bucket) => ({
        upload: (path, file, options) =>
          supabase.storage.from(bucket).upload(path, file, options),
        getPublicUrl: (path) =>
          supabase.storage.from(bucket).getPublicUrl(path),
        remove: (paths) => supabase.storage.from(bucket).remove(paths),
      }),
    },
  };
}

const KUDO_IMAGES_BUCKET = "kudo-images";

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

/** Falls back to a generic extension for a MIME type outside the accepted
 * jpeg/png set. `validate-kudo-images.ts` (phase 04) is the real gate
 * against that ever happening with a well-behaved caller — this function
 * does not re-import/re-check that rule (single responsibility: upload,
 * not validate), so it degrades safely instead of throwing on the
 * unexpected case. */
function extensionFromMimeType(mimeType: string): string {
  return EXTENSION_BY_MIME_TYPE[mimeType] ?? "bin";
}

/**
 * Best-effort delete of already-uploaded objects. Cleanup errors are
 * swallowed on purpose (AD-5): the caller is already on a failure path,
 * and a dangling orphaned Storage object is a far smaller problem than
 * masking the original error that triggered this cleanup.
 */
export async function removeKudoImages(
  client: KudoStorageClient,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) {
    return;
  }
  try {
    await client.storage.from(KUDO_IMAGES_BUCKET).remove(paths);
  } catch {
    // Swallowed intentionally — see JSDoc above.
  }
}

export async function uploadKudoImages(
  client: KudoStorageClient,
  userId: string,
  files: File[],
): Promise<UploadedKudoImages> {
  const uploadedPaths: string[] = [];
  const urls: string[] = [];

  for (const file of files) {
    const path = `${userId}/${crypto.randomUUID()}.${extensionFromMimeType(file.type)}`;
    const { error } = await client.storage
      .from(KUDO_IMAGES_BUCKET)
      .upload(path, file, { contentType: file.type });

    if (error) {
      await removeKudoImages(client, uploadedPaths);
      throw new Error("uploadKudoImages: failed to upload one or more images", {
        cause: error,
      });
    }

    uploadedPaths.push(path);
    urls.push(
      client.storage.from(KUDO_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl,
    );
  }

  return { urls, uploadedPaths };
}
