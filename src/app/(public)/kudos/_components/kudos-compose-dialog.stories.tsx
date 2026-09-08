import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { defaultKudosComposeCopy } from "../_shared/kudos-compose-copy";

import { KudosComposeDialog } from "./kudos-compose-dialog";
import { KudosComposeField } from "./kudos-compose-field";
import { KudosComposeFooter } from "./kudos-compose-footer";

const copy = defaultKudosComposeCopy;

const meta = {
  title: "Kudos/KudosComposeDialog",
  component: KudosComposeDialog,
  parameters: { backgrounds: { default: "dark" } },
  args: {
    title: copy.title,
    onCancel: fn(),
    // Preview-only stand-in for phase-07's hook: opens the real modal (with
    // `::backdrop`) once, imperatively, the same way the hook will —
    // `showModal()` on the node this ref callback receives, guarded so it
    // never re-fires on a node that's already open.
    registerDialog: (node) => {
      if (node && !node.open) node.showModal();
    },
    footer: (
      <KudosComposeFooter
        cancelLabel={copy.cancel}
        submitLabel={copy.submit}
        submittingLabel={copy.submitting}
        canSubmit={false}
        onCancel={fn()}
        onSubmit={fn()}
      />
    ),
  },
} satisfies Meta<typeof KudosComposeDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Short body — three placeholder fields, no scrolling needed. Real
 * Recipient/Danh hiệu/Nội dung/Hashtag/Image/Anonymous fields come from
 * phases 09-12; this story stands in with plain inputs to preview the shell
 * (Out of scope forbids importing those phases' components here). */
export const Open: Story = {
  args: {
    children: (
      <>
        <KudosComposeField
          label={copy.recipientLabel}
          controlId="story-recipient"
          fieldName="recipient"
          required
        >
          <input
            id="story-recipient"
            placeholder={copy.recipientPlaceholder}
            className="h-14 w-full rounded border border-[#998C5F] bg-transparent px-4 font-montserrat text-login-button-text"
          />
        </KudosComposeField>
        <KudosComposeField
          label={copy.titleLabel}
          controlId="story-title"
          fieldName="title"
          required
        >
          <input
            id="story-title"
            placeholder={copy.titlePlaceholder}
            className="h-14 w-full rounded border border-[#998C5F] bg-transparent px-4 font-montserrat text-login-button-text"
          />
        </KudosComposeField>
      </>
    ),
  },
};

/** Body taller than the 90vh cap — proves R2 scrolls (`overflow-y-auto`)
 * instead of pushing the static footer off-screen. */
export const LongBody: Story = {
  args: {
    children: Array.from({ length: 12 }, (_, index) => (
      <p key={index} className="font-montserrat text-login-button-text">
        {copy.contentHint}
      </p>
    )),
  },
};
