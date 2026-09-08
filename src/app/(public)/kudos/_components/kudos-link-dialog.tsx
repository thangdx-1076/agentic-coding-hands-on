"use client";

import type { SyntheticEvent } from "react";

import { IconClose, IconLink } from "./kudos-compose-icons";

export type KudosLinkDialogCopy = {
  title: string;
  textLabel: string;
  urlLabel: string;
  cancel: string;
  save: string;
};

export type KudosLinkDialogProps = {
  copy: KudosLinkDialogCopy;
  text: string;
  url: string;
  textError: string | null;
  urlError: string | null;
  onTextChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  onUrlBlur: () => void;
  onSave: () => void;
  onCancelClick: () => void;
  registerDialog: (node: HTMLDialogElement | null) => void;
  onCancel: (event: SyntheticEvent<HTMLDialogElement>) => void;
};

const LABEL_CLASS =
  "shrink-0 whitespace-nowrap font-montserrat text-[22px] leading-7 font-bold text-login-button-text";

const INPUT_BASE_CLASS =
  "h-14 rounded-lg border bg-white px-6 py-4 font-montserrat text-base font-bold text-login-button-text";

const ERROR_CLASS =
  "font-montserrat text-sm leading-5 font-bold text-[#FF8A80]";

/**
 * mm:I1002:12682 "Add link box" instance, frame `1002:12917` "Addlink Box"
 * (https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/OyDLDuSGEa).
 *
 * Native `<dialog>` nested inside `KudosComposeDialog`'s own `<dialog>`
 * (clarifications.md § "Dựng modal bằng gì") — same open/close contract as
 * that component: this file NEVER renders the `open` attribute itself, and
 * has no `useState`/`useEffect`. The caller's link-dialog hook (phase 02,
 * out of this file's ownership) calls `.showModal()`/`.close()` on the node
 * `registerDialog` hands back — see `kudos-compose-dialog.tsx`'s header
 * comment for the full `open:flex` / Tailwind-Preflight-`margin` /
 * React-commit-order reasoning this component reuses verbatim (`m-auto`,
 * `open:flex`, no `position`/`inset` override).
 *
 * Purely presentational: every field value/error is a controlled prop.
 * Phase 02 (parallel, owns `use-kudos-link-dialog.ts` +
 * `kudos-compose-copy.ts`) constructs the real props at runtime; this file
 * declares its own `KudosLinkDialogCopy`/`KudosLinkDialogProps` shape rather
 * than importing either, so it type-checks standalone (dispatch contract).
 *
 * Row layout for B (Nội dung) / C (URL) uses `items-start` (not the node's
 * own measured `items-center`) plus a growing `flex-col` wrapper around the
 * input + error paragraph — the same deliberate deviation
 * `kudos-compose-field.tsx` documents: a fixed `items-center` row would
 * center the label against the bare 56px input but then clip or misplace
 * the error text once it appears (no design frame covers the error state).
 *
 * D.1/D.2 button classes are copied 1:1 from `kudos-compose-footer.tsx`'s
 * Cancel/Submit (clarifications.md § "D.1/D.2 trùng 1:1"); `IconClose`/
 * `IconLink` are the same Figma icon components, now shared via
 * `kudos-compose-icons.tsx`. `kudos-link-save` deliberately has NO
 * `aria-disabled` — unlike `kudos-compose-submit`, it must always be
 * clickable so Save can surface validation errors (TC e5632ac7).
 */
export function KudosLinkDialog({
  copy,
  text,
  url,
  textError,
  urlError,
  onTextChange,
  onUrlChange,
  onUrlBlur,
  onSave,
  onCancelClick,
  registerDialog,
  onCancel,
}: KudosLinkDialogProps) {
  return (
    // mm:I1002:12682
    <dialog
      data-testid="kudos-link-dialog"
      aria-labelledby="kudos-link-title"
      ref={registerDialog}
      onCancel={onCancel}
      className="m-auto w-[752px] flex-col gap-8 rounded-3xl bg-[#FFF8E1] p-10 text-login-button-text open:flex backdrop:bg-login-background/80"
    >
      {/* mm:I1002:12682;1002:12500 (A) */}
      <h2
        id="kudos-link-title"
        data-testid="kudos-link-title"
        className="shrink-0 text-left font-montserrat text-[32px] leading-10 font-bold"
      >
        {copy.title}
      </h2>

      {/* mm:I1002:12682;1002:12501 (B) */}
      <div className="flex w-full items-start gap-4">
        <label htmlFor="kudos-link-text-input" className={LABEL_CLASS}>
          {copy.textLabel}
        </label>
        <div className="flex flex-1 flex-col gap-2">
          {/* mm:I1002:12682;1002:12503 (B.2) */}
          <input
            id="kudos-link-text-input"
            type="text"
            data-testid="kudos-link-text-input"
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            aria-invalid={textError ? true : undefined}
            aria-describedby={textError ? "kudos-link-text-error" : undefined}
            className={`${INPUT_BASE_CLASS} ${
              textError ? "border-[#FF8A80]" : "border-[#998C5F]"
            }`}
          />
          {textError ? (
            <p
              role="alert"
              id="kudos-link-text-error"
              data-testid="kudos-link-text-error"
              className={ERROR_CLASS}
            >
              {textError}
            </p>
          ) : null}
        </div>
      </div>

      {/* mm:I1002:12682;1002:12652 (C) — child `IC` (`I1002:12682;1002:
          12654;186:2761`) intentionally NOT rendered: no MM_MEDIA_* asset,
          frame image shows no icon (clarifications.md § "Icon IC trong ô
          URL"). */}
      <div className="flex w-full items-start gap-4">
        <label htmlFor="kudos-link-url-input" className={LABEL_CLASS}>
          {copy.urlLabel}
        </label>
        <div className="flex flex-1 flex-col gap-2">
          {/* mm:I1002:12682;1002:12654 (C.2) */}
          <input
            id="kudos-link-url-input"
            type="text"
            data-testid="kudos-link-url-input"
            value={url}
            onChange={(event) => onUrlChange(event.target.value)}
            onBlur={onUrlBlur}
            aria-invalid={urlError ? true : undefined}
            aria-describedby={urlError ? "kudos-link-url-error" : undefined}
            className={`${INPUT_BASE_CLASS} ${
              urlError ? "border-[#FF8A80]" : "border-[#998C5F]"
            }`}
          />
          {urlError ? (
            <p
              role="alert"
              id="kudos-link-url-error"
              data-testid="kudos-link-url-error"
              className={ERROR_CLASS}
            >
              {urlError}
            </p>
          ) : null}
        </div>
      </div>

      {/* mm:I1002:12682;1002:12543 (D) */}
      <div className="flex w-full shrink-0 items-start justify-start gap-6">
        {/* mm:I1002:12682;1002:12544 (D.1) */}
        <button
          type="button"
          data-testid="kudos-link-cancel"
          onClick={onCancelClick}
          className="flex items-center gap-2 self-stretch rounded border border-[#998C5F] bg-login-button/10 px-10 py-4 font-montserrat text-base font-bold tracking-[0.15px] text-login-button-text transition-colors duration-200 ease-out motion-reduce:transition-none hover:bg-login-button/20 focus-visible:ring-2 focus-visible:ring-login-button-text focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF8E1] focus-visible:outline-none"
        >
          <span>{copy.cancel}</span>
          {/* mm:I1002:12682;1002:12544;186:2761 MM_MEDIA_Close */}
          <IconClose aria-hidden="true" className="h-6 w-6 shrink-0" />
        </button>

        {/* mm:I1002:12682;1002:12545 (D.2) */}
        <button
          type="button"
          data-testid="kudos-link-save"
          onClick={onSave}
          className="flex flex-1 items-center justify-center gap-2 self-stretch rounded-lg bg-login-button p-4 font-montserrat text-[22px] leading-7 font-bold text-login-button-text transition-opacity duration-200 ease-out motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-login-button-text focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF8E1] focus-visible:outline-none"
        >
          <span>{copy.save}</span>
          {/* mm:I1002:12682;1002:12545;186:1766 MM_MEDIA_Link */}
          <IconLink aria-hidden="true" className="h-6 w-6 shrink-0" />
        </button>
      </div>
    </dialog>
  );
}
