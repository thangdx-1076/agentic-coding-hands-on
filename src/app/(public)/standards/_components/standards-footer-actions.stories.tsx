import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { sampleStandardsCopy } from "../_shared/standards-copy";

import { StandardsFooterActions } from "./standards-footer-actions";

const meta = {
  title: "Standards/StandardsFooterActions",
  component: StandardsFooterActions,
  args: {
    copy: sampleStandardsCopy.footer,
    onClose: () => {
      // no-op for Storybook — the real page uses useStandardsClose's handleClose
    },
  },
} satisfies Meta<typeof StandardsFooterActions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
