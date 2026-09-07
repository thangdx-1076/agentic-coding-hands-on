import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { KudosFilterBar } from "./kudos-filter-bar";

const meta = {
  title: "Kudos/KudosFilterBar",
  component: KudosFilterBar,
  parameters: { backgrounds: { default: "dark" } },
} satisfies Meta<typeof KudosFilterBar>;

export default meta;

type Story = StoryObj<typeof meta>;

const BASE_ARGS = {
  eyebrow: "Sun* Annual Awards 2025",
  heading: "HIGHLIGHT KUDOS",
  hashtag: {
    label: "Hashtag",
    options: ["teamwork", "leadership", "innovation"],
    selected: null,
    onSelect: () => {},
    onClear: () => {},
  },
  department: {
    label: "Phòng ban",
    options: ["CEVC10", "CDIV02"],
    selected: null,
    onSelect: () => {},
    onClear: () => {},
  },
};

/** No filter selected — both triggers inactive. */
export const Default: Story = {
  args: BASE_ARGS,
};

/** Hashtag filter selected — its trigger switches to the active style. */
export const HashtagSelected: Story = {
  args: {
    ...BASE_ARGS,
    hashtag: { ...BASE_ARGS.hashtag, selected: "teamwork" },
  },
};

/** Department filter selected — its trigger switches to the active style. */
export const DepartmentSelected: Story = {
  args: {
    ...BASE_ARGS,
    department: { ...BASE_ARGS.department, selected: "CEVC10" },
  },
};

/** Both filters selected at once (C14 + C15 combined). */
export const BothSelected: Story = {
  args: {
    ...BASE_ARGS,
    hashtag: { ...BASE_ARGS.hashtag, selected: "teamwork" },
    department: { ...BASE_ARGS.department, selected: "CEVC10" },
  },
};

/** Both dropdowns returned zero rows from the DB — buttons stay visible
 * and enabled (C04, FR-206). */
export const EmptyOptions: Story = {
  args: {
    ...BASE_ARGS,
    hashtag: { ...BASE_ARGS.hashtag, options: [] },
    department: { ...BASE_ARGS.department, options: [] },
  },
};
