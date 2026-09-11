import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRef } from "react";
import { fn } from "storybook/test";

import { defaultKudosComposeCopy } from "../_shared/kudos-compose-copy";

import type { KudosHashtagPickerProps } from "./kudos-hashtag-picker";
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

/** The picker places itself as a `fixed` popover against a real anchor
 * element, so a story has to give it one — rendered here as a stand-in for
 * the "+ Hashtag" button the compose field supplies in the app. */
function PickerWithAnchor(
  args: Omit<KudosHashtagPickerProps, "anchorRef">,
): React.ReactElement {
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  return (
    <div className="p-6">
      <button
        ref={anchorRef}
        type="button"
        className="rounded-lg border border-[#998C5F] bg-white px-2 py-1 font-montserrat text-[11px] font-bold text-[#999]"
      >
        + Hashtag
      </button>
      <KudosHashtagPicker {...args} anchorRef={anchorRef} />
    </div>
  );
}

const meta = {
  title: "Kudos/KudosHashtagPicker",
  component: KudosHashtagPicker,
  render: (args) => <PickerWithAnchor {...args} />,
  parameters: { backgrounds: { default: "dark" } },
  args: {
    suggestions: SUGGESTIONS,
    hashtags: SELECTED,
    limitReached: false,
    label: copy.hashtagPickerLabel,
    onQueryChange: fn(),
    onAdd: fn(),
    onRemove: fn(),
    onClose: fn(),
    // Replaced by `PickerWithAnchor`'s own ref at render time; present only
    // so the args satisfy the component's required props.
    anchorRef: { current: null },
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

/** Đã chọn 5 (BR-002 cap) — rows NOT already selected are `disabled`
 * (opacity + `cursor-not-allowed`, no hover, no click); the 3 selected
 * rows above stay clickable so the user can still unselect one
 * (`momorph/specs-p9zO-c4a4x.csv` rows A.1/B.1/C.1/D). */
export const Full: Story = {
  args: {
    query: "",
    hashtags: SUGGESTIONS.slice(0, 5),
    limitReached: true,
  },
};
