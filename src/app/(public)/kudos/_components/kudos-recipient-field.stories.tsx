import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { defaultKudosComposeCopy } from "../_shared/kudos-compose-copy";

import { KudosRecipientField } from "./kudos-recipient-field";

const copy = defaultKudosComposeCopy;

/** Real seeded Sunners (`supabase/migrations/0008_kudos_demo_seed.sql`) —
 * same rows C21's `@local-db` search hits against `profile_cards`. */
const SEEDED_OPTIONS = [
  {
    id: "a0000000-0000-4000-8000-000000000001",
    fullName: "Đỗ hoàng Hiệp",
    avatarUrl: null,
    department: "CEVC1",
  },
  {
    id: "a0000000-0000-4000-8000-000000000002",
    fullName: "Dương thúy An",
    avatarUrl: null,
    department: "CEVC1",
  },
  {
    id: "a0000000-0000-4000-8000-000000000007",
    fullName: "Nguyễn Hoàng Linh",
    avatarUrl: null,
    department: "CEVC1",
  },
];

const meta = {
  title: "Kudos/KudosRecipientField",
  component: KudosRecipientField,
  parameters: { backgrounds: { default: "light" } },
  args: {
    copy,
    query: "",
    options: [],
    isOpen: false,
    onQueryChange: fn(),
    onSelect: fn(),
  },
} satisfies Meta<typeof KudosRecipientField>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Initial state — empty search, dropdown closed (C05). */
export const Empty: Story = {};

/** Typing has produced seeded results; dropdown open (C21). */
export const Typing: Story = {
  args: {
    query: "Nguyễn",
    isOpen: true,
    options: SEEDED_OPTIONS,
  },
};

/** `onSelect` fired — `query` now holds the picked Sunner's name, dropdown
 * closed (this field keeps no separate `selected` prop, see header comment). */
export const Selected: Story = {
  args: {
    query: "Nguyễn Hoàng Linh",
    isOpen: false,
    options: [],
  },
};

/** No design node for this state (clarifications.md § "Frame phụ trợ") —
 * follows `kudos-compose-field.tsx`'s established error styling (C20). */
export const WithError: Story = {
  args: {
    error: copy.errorRequired,
  },
};
