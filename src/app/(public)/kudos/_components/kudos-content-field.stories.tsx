import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { defaultKudosComposeCopy } from "../_shared/kudos-compose-copy";

import { KudosContentField } from "./kudos-content-field";

const copy = defaultKudosComposeCopy;

const meta = {
  title: "Kudos/KudosContentField",
  component: KudosContentField,
  parameters: { backgrounds: { default: "light" } },
  decorators: [
    (Story) => (
      <div className="w-[672px]">
        <Story />
      </div>
    ),
  ],
  args: {
    copy,
    onChange: fn(),
    onFormat: fn(),
    onMentionSelect: fn(),
    registerTextarea: () => {},
  },
} satisfies Meta<typeof KudosContentField>;

export default meta;

type Story = StoryObj<typeof meta>;

/** mm:I520:11647;520:9886 — untouched state, placeholder + hint visible. */
export const Empty: Story = {
  args: {
    value: "",
  },
};

/** Typed content, toolbar still available for further formatting. */
export const Filled: Story = {
  args: {
    value:
      "Cảm ơn bạn rất nhiều vì đã luôn hỗ trợ team trong dự án vừa qua! **Tuyệt vời**",
  },
};

/** No design node for this state (clarifications.md § "Frame phụ trợ" —
 * `5c7PkAibyD` has no node data); follows `KudosComposeField`'s own error
 * markup/red (`#FF8A80`), reproduced locally since this field doesn't use
 * that shared shell (see this component's header comment). */
export const WithError: Story = {
  args: {
    value: "",
    error: copy.errorRequired,
  },
};

/** C27 — typing `@Ngu` opens the mention suggestion list reusing
 * `KudosSunnerOptions` under the mention contract's ids. */
export const MentionOpen: Story = {
  args: {
    value: "Cảm ơn @Ngu",
    mentionOpen: true,
    mentionOptions: [
      {
        id: "1",
        fullName: "Nguyễn Văn A",
        avatarUrl: null,
        department: "CEVC1",
      },
      {
        id: "2",
        fullName: "Nguyễn Thị B",
        avatarUrl: null,
        department: "CEVC1",
      },
    ],
  },
};
