import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

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
    labelPrefix: "#",
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
 * Open state (real click, `play` — `open` is `useMenuKeyboardNav`'s internal
 * state, not a prop, same rule as `language-selector.stories.tsx` `Open`).
 * Locks FR-218/BR-019: the selected option (`aria-selected="true"`) carries
 * the design's background + text-shadow, and the label reads `#teamwork`
 * while `data-value` stays the bare `"teamwork"` — verified against node
 * `563:8026` / `I563:8026;525:13508`.
 */
export const HashtagSelectedOpen: Story = {
  args: {
    ...HashtagSelected.args,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { expanded: false });

    await userEvent.click(trigger);

    const selectedOption = canvas.getByRole("option", { name: "#teamwork" });
    await expect(selectedOption).toHaveAttribute("aria-selected", "true");
    await expect(selectedOption).toHaveAttribute("data-value", "teamwork");
  },
};

/**
 * Department menu (`labelPrefix` unset) with 50 options — the department
 * list is now DISTINCT-from-real-data (phase 01), not a fixed ~50-item set,
 * so the panel must scroll instead of overflowing. Locks `max-h-87`
 * (348px, node `563:8027` height) + `overflow-y-auto` on the panel.
 */
const MANY_DEPARTMENTS = Array.from(
  { length: 50 },
  (_, index) => `Department ${index + 1}`,
);

export const ManyOptionsScroll: Story = {
  args: {
    label: "Phòng ban",
    options: MANY_DEPARTMENTS,
    selected: null,
    onSelect: () => {},
    onClear: () => {},
    testId: "kudos-filter-department",
    optionTestId: "kudos-filter-department-option",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { expanded: false });

    await userEvent.click(trigger);

    const panel = canvas.getByRole("listbox");
    await expect(panel).toHaveStyle({ maxHeight: "348px", overflowY: "auto" });
    await expect(canvas.getAllByRole("option")).toHaveLength(50);
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
