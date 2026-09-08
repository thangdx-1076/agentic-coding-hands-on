import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { defaultKudosComposeCopy } from "../_shared/kudos-compose-copy";

import { KudosFormatToolbar } from "./kudos-format-toolbar";

const copy = defaultKudosComposeCopy;

const meta = {
  title: "Kudos/KudosFormatToolbar",
  component: KudosFormatToolbar,
  parameters: { backgrounds: { default: "light" } },
  decorators: [
    (Story) => (
      <div className="w-[672px]">
        <Story />
      </div>
    ),
  ],
  args: {
    copy: copy.toolbar,
    standardsLabel: copy.standardsLink,
    onFormat: fn(),
  },
} satisfies Meta<typeof KudosFormatToolbar>;

export default meta;

type Story = StoryObj<typeof meta>;

/** mm:I520:11647;520:9877 — 6 format buttons + the right-aligned
 * "Tiêu chuẩn cộng đồng" link, no design variant for a pressed state. */
export const Default: Story = {};
