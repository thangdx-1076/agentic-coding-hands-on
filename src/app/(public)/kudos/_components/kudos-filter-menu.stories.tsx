import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { KudosFilterMenu } from "./kudos-filter-menu";

const meta = {
  title: "Kudos/KudosFilterMenu",
  component: KudosFilterMenu,
  parameters: { backgrounds: { default: "dark" } },
} satisfies Meta<typeof KudosFilterMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

const HASHTAG_OPTIONS = ["teamwork", "leadership", "innovation"];

/** No selection — inactive trigger style, `data-active="false"`. */
export const Default: Story = {
  args: {
    label: "Hashtag",
    options: HASHTAG_OPTIONS,
    selected: null,
    onSelect: () => {},
    onClear: () => {},
    testId: "kudos-filter-hashtag",
    optionTestId: "kudos-filter-hashtag-option",
  },
};

/** A value is selected — active trigger style, `data-active="true"`,
 * trigger label shows the selected value instead of "Hashtag" (TC[06]). */
export const HashtagSelected: Story = {
  args: {
    ...Default.args,
    selected: "teamwork",
  },
};

/**
 * DB query returned zero rows (no local Supabase seed). The button MUST
 * stay visible and enabled — CI runs against an empty database and C04
 * asserts on exactly this state (FR-206, phase-08 Success Criteria).
 */
export const EmptyOptions: Story = {
  args: {
    ...Default.args,
    label: "Phòng ban",
    options: [],
    testId: "kudos-filter-department",
    optionTestId: "kudos-filter-department-option",
  },
};

/** Interactive: click the trigger to open, click an option to select it,
 * click it again to clear (see the component's clear-by-reselect note). */
export const Interactive: Story = {
  render: (args) => {
    function Wrapper() {
      const [selected, setSelected] = useState<string | null>(null);
      return (
        <KudosFilterMenu
          {...args}
          selected={selected}
          onSelect={setSelected}
          onClear={() => setSelected(null)}
        />
      );
    }
    return <Wrapper />;
  },
  args: Default.args,
};
