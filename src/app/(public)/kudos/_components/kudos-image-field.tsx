"use client";

import type { ChangeEvent, SVGProps } from "react";
import { useRef } from "react";

import { MAX_KUDO_IMAGES } from "../_utils/validate-kudo-images";

import { KudosComposeField } from "./kudos-compose-field";

export type KudosImageItem = {
  id: string;
  previewUrl: string;
  name: string;
};

export type KudosImageFieldProps = {
  images: KudosImageItem[];
  onFilesSelected: (files: FileList | File[]) => void;
  onRemove: (id: string) => void;
  /** Defaults to `MAX_KUDO_IMAGES` (5, BR-003) — a prop so a story can demo
   * a smaller ceiling without waiting on real data. */
  max?: number;
  error?: string | null;
  /** mm:I520:11647;520:9897 (F.1) — "Image" label. */
  label: string;
  /** mm:I520:11647;662:9133;186:2760 (F.5) — "+ Image" button text. */
  addLabel: string;
  /** Same node as `addLabel`, second line — "Tối đa 5" (shared with Hashtag). */
  limitNote: string;
  /** `KudosComposeCopy.imageRemove` template ("Xóa ảnh {index}"). */
  removeLabel: string;
};

/**
 * mm:I520:11647;520:9896 (F) "Image" field
 * (https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/ihQ26W78P2) —
 * label (F.1) + up to `max` thumbnails (F.2-F.4 named; 2 more unnamed
 * "Image" instances share the same `256:4719` component, all 5 identical)
 * + "+ Image" button (F.5, `MM_MEDIA_Plus` `…;662:9133;186:2759`). NOT
 * required — unlike Frame 552/B.1/E.1, node F.1 carries no `*`.
 *
 * The `<input type="file">` is real and always in the DOM (`hidden`
 * attribute only, never conditionally removed) — Playwright's
 * `setInputFiles` is the only way C15/C16/C17 can drive a file picker, and
 * a fake button-only upload UI would leave those contracts permanently red
 * (this phase's Risk Assessment, row 1). The visible "+ Image" button
 * forwards its click to this hidden input via a ref; once
 * `images.length >= max` the button is unmounted entirely (not merely
 * hidden), which already satisfies C16's `toBeHidden()`.
 *
 * Thumbnails use a plain `<img>`, not `next/image`: `previewUrl` will be a
 * `blob:` object URL once phase 07's hook wires local file selection
 * (created THERE, not here — matching the dispatch contract's "Object URLs
 * for previews are created/revoked by phase 07's hook, not here"). Next's
 * default Image loader fetches `src` server-side to optimize it
 * (`node_modules/next/dist/docs/01-app/03-api-reference/02-components/
 * image.md`), but a `blob:` URL only exists inside the browser tab that
 * created it — the server-side optimizer can never reach it. A plain
 * `<img>` sidesteps that (equivalent to `unoptimized` here) and renders
 * identically for the Storybook static path and a real future `blob:` URL.
 *
 * Format/size validation (BR-003/FR-404) is NOT this component's job — it
 * only forwards the picked `FileList` to `onFilesSelected`; the caller
 * (phase 07, running `validateKudoImages`) decides what `error` string (if
 * any) reaches `KudosComposeField`'s alert below.
 */
export function KudosImageField({
  images,
  onFilesSelected,
  onRemove,
  max = MAX_KUDO_IMAGES,
  error = null,
  label,
  addLabel,
  limitNote,
  removeLabel,
}: KudosImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canAddMore = images.length < max;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { files } = event.target;
    if (files && files.length > 0) onFilesSelected(files);
    // Reset so picking the exact same file again still fires `onChange`.
    event.target.value = "";
  }

  return (
    // mm:I520:11647;520:9896
    <KudosComposeField
      label={label}
      controlId="kudos-image-input"
      fieldName="images"
      error={error}
    >
      <div className="flex w-full flex-row flex-wrap items-center gap-4">
        {images.map((image, index) => (
          // mm:I520:11647;662:9197 (shared shape for F.2-F.4 + 2 unnamed instances)
          <div
            key={image.id}
            data-testid="kudos-image-thumb"
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[18px] border border-[#998C5F] bg-white"
          >
            {/* mm:I520:11647;662:9197;256:4717 MM_MEDIA_Sample Image */}
            {/* eslint-disable-next-line @next/next/no-img-element -- blob: preview URLs can't go through next/image's server-side optimizer, see header comment */}
            <img
              src={image.previewUrl}
              alt={image.name}
              className="h-full w-full object-cover"
            />
            {/* mm:I520:11647;662:9197;662:9287 */}
            <button
              type="button"
              data-testid="kudos-image-remove"
              aria-label={removeLabel.replace("{index}", String(index + 1))}
              onClick={() => onRemove(image.id)}
              className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#D4271D] text-white"
            >
              {/* mm:I520:11647;662:9197;662:9287;186:1420 MM_MEDIA_Close Tiny */}
              <IconCloseTiny className="h-[17px] w-[17px]" />
            </button>
          </div>
        ))}

        {canAddMore ? (
          // mm:I520:11647;662:9132 (F.5)
          <button
            type="button"
            data-testid="kudos-image-add"
            onClick={() => inputRef.current?.click()}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-[#998C5F] bg-white px-2 py-1 text-[#999]"
          >
            {/* mm:I520:11647;662:9133;186:2759 MM_MEDIA_Plus */}
            <IconPlus className="h-6 w-6 shrink-0" />
            <span className="flex flex-col items-start font-montserrat text-[11px] leading-4 font-bold tracking-[0.5px]">
              <span>{addLabel}</span>
              <span>{limitNote}</span>
            </span>
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        id="kudos-image-input"
        type="file"
        accept="image/png,image/jpeg"
        multiple
        hidden
        data-testid="kudos-image-input"
        onChange={handleChange}
      />
    </KudosComposeField>
  );
}

/**
 * `MM_MEDIA_Plus` (`490:5726`) inlined with `currentColor` (code-rules
 * §2a) — the exported vector ships `fill="white"`, invisible against this
 * button's white background. `#999` (`Details-Text-Secondary-2`, already
 * confirmed on this screen's placeholder/border colors) is the closest
 * defensible read, per `kudos-heart-button.tsx`'s precedent for reasoning
 * about an unusable raw export fill.
 */
function IconPlus(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="currentColor" />
    </svg>
  );
}

/** `MM_MEDIA_Close Tiny` (`490:5771`) inlined with `currentColor` — raw
 * export fill (white) is correct as-is on the red `bg-[#D4271D]` remove
 * button, which sets `text-white` for it. */
function IconCloseTiny(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="8"
      height="8"
      viewBox="0 0 8 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M4.49187 4.09701L6.33854 5.94367V6.43034H5.85187L4.00521 4.58367L2.15854 6.43034H1.67188V5.94367L3.51854 4.09701L1.67188 2.25034V1.76367H2.15854L4.00521 3.61034L5.85187 1.76367H6.33854V2.25034L4.49187 4.09701Z"
        fill="currentColor"
      />
    </svg>
  );
}
