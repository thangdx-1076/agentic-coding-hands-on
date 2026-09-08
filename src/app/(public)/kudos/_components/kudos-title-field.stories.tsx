import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { defaultKudosComposeCopy } from "../_shared/kudos-compose-copy";

import { KudosTitleField } from "./kudos-title-field";

const copy = defaultKudosComposeCopy;

const meta = {
  title: "Kudos/KudosTitleField",
  component: KudosTitleField,
  parameters: { backgrounds: { default: "light" } },
  args: {
    copy,
    value: "",
    onValueChange: fn(),
  },
} satisfies Meta<typeof KudosTitleField>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Initial state — empty, placeholder + 2-line hint visible (C06). */
export const Empty: Story = {};

/** User has typed a title. */
export const Filled: Story = {
  args: {
    value: "Người truyền động lực cho tôi",
  },
};

/** No design node for this state (clarifications.md § "Frame phụ trợ") —
 * follows `kudos-compose-field.tsx`'s established error styling (C20). */
export const WithError: Story = {
  args: {
    error: copy.errorRequired,
  },
};
