import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { defaultKudosComposeCopy } from "../_shared/kudos-compose-copy";

import { KudosComposeFooter } from "./kudos-compose-footer";

const copy = defaultKudosComposeCopy;

const meta = {
  title: "Kudos/KudosComposeFooter",
  component: KudosComposeFooter,
  parameters: { backgrounds: { default: "light" } },
  args: {
    cancelLabel: copy.cancel,
    submitLabel: copy.submit,
    submittingLabel: copy.submitting,
    onCancel: fn(),
    onSubmit: fn(),
  },
} satisfies Meta<typeof KudosComposeFooter>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Initial state (C05/ID-48) — required fields empty, `Gửi`
 * `aria-disabled="true"`. `onSubmit` still always fires (AD-1). */
export const Disabled: Story = {
  args: {
    canSubmit: false,
  },
};

/** 4 required fields valid (C22/ID-49) — `Gửi` loses `aria-disabled`. */
export const Enabled: Story = {
  args: {
    canSubmit: true,
  },
};

/** In-flight submit — spinner replaces the send icon, `aria-busy`. */
export const Submitting: Story = {
  args: {
    canSubmit: true,
    submitting: true,
  },
};
