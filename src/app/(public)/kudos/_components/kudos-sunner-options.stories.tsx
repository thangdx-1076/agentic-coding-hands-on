import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { defaultKudosComposeCopy } from "../_shared/kudos-compose-copy";

import { KudosSunnerOptions } from "./kudos-sunner-options";

const copy = defaultKudosComposeCopy;

const meta = {
  title: "Kudos/KudosSunnerOptions",
  component: KudosSunnerOptions,
  parameters: { backgrounds: { default: "light" } },
  // `absolute top-full left-0` needs a positioned ancestor to preview
  // sensibly — the real ancestor is phase-09's recipient input wrapper.
  decorators: [
    (Story) => (
      <div className="relative h-16 w-96">
        <Story />
      </div>
    ),
  ],
  args: {
    label: copy.recipientLabel,
    loadingLabel: copy.recipientLoading,
    emptyLabel: copy.recipientEmpty,
    onSelect: fn(),
  },
} satisfies Meta<typeof KudosSunnerOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Seeded Sunners matching (C21) — real result rows, avatar + full name. */
export const WithResults: Story = {
  args: {
    options: [
      { id: "1", fullName: "Nguyễn Văn A", avatarUrl: null },
      { id: "2", fullName: "Nguyễn Thị B", avatarUrl: null },
      { id: "3", fullName: "Trần Văn C", avatarUrl: null },
    ],
  },
};

/** Debounced search in flight (AD-6, 250ms). */
export const Loading: Story = {
  args: {
    options: [],
    loading: true,
  },
};

/** Query matched zero Sunners. */
export const Empty: Story = {
  args: {
    options: [],
    loading: false,
  },
};

/** Phase-10 reuse — `@`-mention suggestions in the content textarea (C27)
 * render this same listbox under the mention contract's own ids instead of
 * the recipient field's defaults. */
export const MentionIds: Story = {
  args: {
    listboxTestId: "kudos-mention-options",
    optionTestId: "kudos-mention-option",
    options: [
      { id: "1", fullName: "Nguyễn Văn A", avatarUrl: null },
      { id: "2", fullName: "Nguyễn Thị B", avatarUrl: null },
    ],
  },
};
