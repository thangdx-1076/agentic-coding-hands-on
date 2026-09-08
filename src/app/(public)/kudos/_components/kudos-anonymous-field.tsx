"use client";

import type { ChangeEvent } from "react";

import { KudosComposeField } from "./kudos-compose-field";

export type KudosAnonymousFieldProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  name: string;
  onNameChange: (value: string) => void;
  nameError?: string | null;
  /** mm:I520:11647;520:14095 (G) — "Gửi lời cám ơn và ghi nhận ẩn danh". */
  label: string;
  /** No design node (frame `p9vFVBE_tc` has no node data) — see header
   * comment; doubles as the name input's accessible label. */
  nameLabel: string;
  /** Same no-data gap as `nameLabel` — used as the input's placeholder. */
  namePlaceholder: string;
};

/**
 * mm:I520:11647;520:14099 (G) "Gửi ẩn danh" checkbox row
 * (https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/ihQ26W78P2) +
 * conditional anonymous-name input.
 *
 * The checkbox row (checkbox `…;520:14097` + label text `…;520:14095`) is
 * its OWN row, deliberately NOT wrapped in `KudosComposeField` — that
 * shared shell stacks its `label` ABOVE `children` (see its own header
 * comment / `Default` story), which is the wrong shape for a checkbox
 * whose label sits beside it, not above it. Node `520:14095`'s measured
 * fill is `#999` (`Details-Text-Secondary-2`) — distinct from the dark
 * navy (`#00101A`) every OTHER field label on this screen uses — so this
 * row does not borrow `KudosComposeField`'s label typography even for the
 * color, only for `font-montserrat font-bold`.
 *
 * The "đã tick" (checked) state is NOT drawn anywhere in frame
 * `520:11647` — only the unchecked square (`Check box` node, no checkmark
 * variant). The frame that should cover it, `p9vFVBE_tc "Ẩn danh"`, is
 * design `in_progress` with NO node data at all (clarifications.md §
 * "Frame phụ trợ" — confirmed empty, not merely unread yet). So the name
 * input below has zero design measurements to read: it borrows
 * `KudosComposeField`'s existing box styling for a text input, verbatim
 * from `kudos-compose-field.stories.tsx`'s title-input class (`h-14
 * w-full rounded border border-[#998C5F] bg-transparent px-4
 * font-montserrat text-login-button-text`) — the same border color,
 * radius shape and font as the real, measured "Danh hiệu" input box
 * (`I520:11647;1688:10437`: white bg, `#998C5F` 1px border, Montserrat),
 * per the dispatch contract's "mirror the title input's box style". No
 * measurement here is invented; it is copied from an already-measured
 * sibling field.
 *
 * Unticking removes the name input from the DOM entirely (not merely
 * `hidden`) — C18/ID-44 assert `toHaveCount(0)`, and D001
 * (clarifications.md) blocks submit on an empty anonymous name only while
 * the field is actually mounted and required, so mount state IS the
 * validation gate here, not a visibility toggle.
 */
export function KudosAnonymousField({
  checked,
  onCheckedChange,
  name,
  onNameChange,
  nameError = null,
  label,
  nameLabel,
  namePlaceholder,
}: KudosAnonymousFieldProps) {
  function handleCheckedChange(event: ChangeEvent<HTMLInputElement>) {
    onCheckedChange(event.target.checked);
  }

  function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
    onNameChange(event.target.value);
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {/* mm:I520:11647;520:14099 */}
      <label className="flex w-full flex-row items-center gap-4 font-montserrat font-bold text-[#999]">
        {/* mm:I520:11647;520:14097 "Check box" */}
        <input
          type="checkbox"
          data-testid="kudos-anonymous-checkbox"
          checked={checked}
          onChange={handleCheckedChange}
          className="h-6 w-6 shrink-0 cursor-pointer rounded border border-[#999] bg-white accent-login-button-text"
        />
        {/* mm:I520:11647;520:14095 */}
        <span className="text-lg leading-7">{label}</span>
      </label>

      {checked ? (
        <KudosComposeField
          label={nameLabel}
          controlId="kudos-anonymous-name-input"
          fieldName="anonymousName"
          required
          error={nameError}
        >
          <input
            id="kudos-anonymous-name-input"
            type="text"
            data-testid="kudos-anonymous-name-input"
            value={name}
            placeholder={namePlaceholder}
            onChange={handleNameChange}
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? "anonymousName-error" : undefined}
            className="h-14 w-full rounded border border-[#998C5F] bg-transparent px-4 font-montserrat text-login-button-text"
          />
        </KudosComposeField>
      ) : null}
    </div>
  );
}
