import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRef } from "react";
import { fn } from "storybook/test";

import { defaultKudosComposeCopy } from "../_shared/kudos-compose-copy";

import type { KudosSunnerOptionsProps } from "./kudos-sunner-options";
import { KudosSunnerOptions } from "./kudos-sunner-options";

const copy = defaultKudosComposeCopy;

/** The list places itself as a `fixed` popover against a real anchor, so a
 * story has to supply one — this stands in for the recipient combobox box
 * the field passes in the app. */
function OptionsWithAnchor(
  args: Omit<KudosSunnerOptionsProps, "anchorRef">,
): React.ReactElement {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  return (
    <div className="p-6">
      <div
        ref={anchorRef}
        className="flex w-96 items-center rounded-lg border border-[#998C5F] bg-white px-6 py-4 font-montserrat text-base font-bold text-[#999]"
      >
        {copy.recipientPlaceholder}
      </div>
      <KudosSunnerOptions {...args} anchorRef={anchorRef} />
    </div>
  );
}

const meta = {
  title: "Kudos/KudosSunnerOptions",
  component: KudosSunnerOptions,
  render: (args) => <OptionsWithAnchor {...args} />,
  parameters: { backgrounds: { default: "light" } },
  args: {
    label: copy.recipientLabel,
    loadingLabel: copy.recipientLoading,
    emptyLabel: copy.recipientEmpty,
    onSelect: fn(),
    // Replaced by `OptionsWithAnchor`'s own ref at render time; present only
    // so the args satisfy the component's required props.
    anchorRef: { current: null },
  },
} satisfies Meta<typeof KudosSunnerOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Seeded Sunners matching (C21) — real result rows, avatar + full name. */
export const WithResults: Story = {
  args: {
    options: [
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
      { id: "3", fullName: "Trần Văn C", avatarUrl: null, department: "CEVC1" },
    ],
  },
};

/** Debounced search in flight (AD-6, 250ms). */
export const Loading: Story = {
  args: {
    options: [],
    loading: true,
  },
};

/** Query matched zero Sunners. */
export const Empty: Story = {
  args: {
    options: [],
    loading: false,
  },
};

/** Phase-10 reuse — `@`-mention suggestions in the content textarea (C27)
 * render this same listbox under the mention contract's own ids instead of
 * the recipient field's defaults. */
export const MentionIds: Story = {
  args: {
    listboxTestId: "kudos-mention-options",
    optionTestId: "kudos-mention-option",
    options: [
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
