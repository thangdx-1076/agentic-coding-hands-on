import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { defaultKudosComposeCopy } from "../_shared/kudos-compose-copy";

import { KudosComposeField } from "./kudos-compose-field";

const copy = defaultKudosComposeCopy;

const meta = {
  title: "Kudos/KudosComposeField",
  component: KudosComposeField,
  parameters: { backgrounds: { default: "light" } },
  args: {
    label: copy.titleLabel,
    controlId: "story-title-input",
    fieldName: "title",
    // Default `layout="row"` — 139px is Danh hiệu's own measured label
    // column width (`I520:11647;1688:10436`), not a guessed constant.
    labelWidth: 139,
  },
} satisfies Meta<typeof KudosComposeField>;

export default meta;

type Story = StoryObj<typeof meta>;

const inputClassName =
  "h-14 w-full rounded border border-[#998C5F] bg-transparent px-4 font-montserrat text-login-button-text";

/** No `*`, no error — row layout, label beside the control (mm:Frame 552
 * "Danh hiệu" shape without the required marker). */
export const Default: Story = {
  args: {
    required: false,
    children: (
      <input
        id="story-title-input"
        placeholder={copy.titlePlaceholder}
        className={inputClassName}
      />
    ),
  },
};

/** mm:Frame 552 "Danh hiệu" — `*` marker for a required field. */
export const Required: Story = {
  args: {
    required: true,
    children: (
      <input
        id="story-title-input"
        placeholder={copy.titlePlaceholder}
        className={inputClassName}
      />
    ),
  },
};

/** No design node for this state (frame `5c7PkAibyD` has no node data) —
 * follows `login-error-alert.tsx`'s red, see this component's header
 * comment. */
export const WithError: Story = {
  args: {
    required: true,
    error: copy.errorRequired,
    children: (
      <input
        id="story-title-input"
        placeholder={copy.titlePlaceholder}
        aria-invalid
        aria-describedby="title-error"
        className={`${inputClassName} border-[#FF8A80]`}
      />
    ),
  },
};

/** `layout="stack"` — label above, full width, no fixed column. Matches the
 * Content section (`I520:11647;520:9874`), which has no left label at all;
 * this is the shell's original shape before row layout became the default. */
export const Stack: Story = {
  args: {
    label: copy.contentLabel,
    controlId: "story-content-textarea",
    fieldName: "content",
    layout: "stack",
    labelWidth: undefined,
    required: true,
    children: (
      <textarea
        id="story-content-textarea"
        placeholder={copy.contentPlaceholder}
        rows={4}
        className={`${inputClassName} h-auto resize-none py-3`}
      />
    ),
  },
};
