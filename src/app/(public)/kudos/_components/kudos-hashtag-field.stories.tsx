import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { defaultKudosComposeCopy } from "../_shared/kudos-compose-copy";

import { KudosHashtagField } from "./kudos-hashtag-field";

const copy = defaultKudosComposeCopy;

/** Same 8 rows as `kudos-hashtag-picker.stories.tsx` — read verbatim off
 * frame `1002:13013`
 * (https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/p9zO-c4a4x). */
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

const meta = {
  title: "Kudos/KudosHashtagField",
  component: KudosHashtagField,
  parameters: { backgrounds: { default: "light" } },
  args: {
    suggestions: SUGGESTIONS,
    pickerOpen: false,
    query: "",
    limitReached: false,
    label: copy.hashtagLabel,
    addLabel: copy.hashtagAdd,
    limitNote: copy.limitNote,
    pickerLabel: copy.hashtagPickerLabel,
    removeLabelTemplate: copy.hashtagRemove,
    maxMessage: copy.errorHashtagMax,
    onQueryChange: fn(),
    onPickerOpenChange: fn(),
    onAdd: fn(),
    onRemove: fn(),
  },
} satisfies Meta<typeof KudosHashtagField>;

export default meta;

type Story = StoryObj<typeof meta>;

/** mm:I520:11647;662:8595 — 0 chips, matches the frame's own mockup. */
export const Empty: Story = {
  args: {
    hashtags: [],
  },
};

/** 3 chips — the same rows the picker frame marks "đã chọn". */
export const WithChips: Story = {
  args: {
    hashtags: SUGGESTIONS.slice(0, 3),
  },
};

/** 5 chips (BR-002 limit) — `+ Hashtag` gets `aria-disabled` and the field
 * shows `errorHashtagMax` (ID-16/ID-17/C14), yet stays visible/clickable. */
export const Full: Story = {
  args: {
    hashtags: SUGGESTIONS.slice(0, 5),
    limitReached: true,
  },
};

/** No design node for this state (frame `5c7PkAibyD` has no node data) —
 * follows `kudos-compose-field.stories.tsx`'s own `WithError` story. */
export const WithError: Story = {
  args: {
    hashtags: [],
    error: copy.errorRequired,
  },
};
