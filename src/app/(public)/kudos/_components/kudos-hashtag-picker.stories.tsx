import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { defaultKudosComposeCopy } from "../_shared/kudos-compose-copy";

import { KudosHashtagPicker } from "./kudos-hashtag-picker";

const copy = defaultKudosComposeCopy;

/** Read verbatim off frame `1002:13013` "Dropdown list hashtag"
 * (https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/p9zO-c4a4x) —
 * rows `mms_A/B/C_Hashtag đã chọn` then `mms_D` + 4 more "chưa chọn". */
const SUGGESTIONS = [
  "High-perorming",
  "BE PROFESSIONAL",
  "BE OPTIMISTIC",
  "BE A TEAM",
  "THINK OUTSIDE THE BOX",
  "GET RISKY",
  "GO FAST",
  "WASSHOI",
];
const SELECTED = SUGGESTIONS.slice(0, 3);

const meta = {
  title: "Kudos/KudosHashtagPicker",
  component: KudosHashtagPicker,
  parameters: { backgrounds: { default: "dark" } },
  args: {
    suggestions: SUGGESTIONS,
    hashtags: SELECTED,
    label: copy.hashtagPickerLabel,
    onQueryChange: fn(),
    onAdd: fn(),
    onRemove: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof KudosHashtagPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 3 rows highlighted `bg-login-button/20` (đã chọn, checkmark) mixed with
 * 5 plain rows (chưa chọn) — the frame's actual mix. */
export const Open: Story = {
  args: {
    query: "",
  },
};

/** Free text in progress (the same `TeamWork` value C12's DOM contract
 * types) — no matching row, so Enter (not a row click) is how it commits. */
export const Typing: Story = {
  args: {
    query: "TeamWork",
  },
};
