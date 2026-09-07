import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { KudosSunnerSearch } from "./kudos-sunner-search";

const meta = {
  title: "Kudos/KudosSunnerSearch",
  component: KudosSunnerSearch,
} satisfies Meta<typeof KudosSunnerSearch>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Literal `messages/vi.json` `kudos.spotlight.searchPlaceholder`/`.searchSubmit`. */
const baseArgs = {
  placeholder: "Tìm kiếm",
  submitLabel: "Tìm kiếm",
};

/** Empty query — submit button `disabled` (C05). */
export const Empty: Story = {
  args: { ...baseArgs, query: "", canSubmit: false, onQueryChange: () => {} },
};

/** Non-empty query — submit button enabled. */
export const Filled: Story = {
  args: {
    ...baseArgs,
    query: "Đỗ",
    canSubmit: true,
    onQueryChange: () => {},
  },
};

/** Interactive — types into a real controlled input; verifies `maxLength`
 * (C06) actually clamps at 100 characters in a rendered browser. */
export const Interactive: StoryObj<typeof KudosSunnerSearch> = {
  render: (args) => {
    function Wrapper() {
      const [query, setQuery] = useState("");
      return (
        <KudosSunnerSearch
          {...args}
          query={query}
          onQueryChange={setQuery}
          canSubmit={query.trim().length > 0}
        />
      );
    }
    return <Wrapper />;
  },
  args: baseArgs,
};
