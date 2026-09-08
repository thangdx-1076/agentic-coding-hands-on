import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { defaultKudosComposeCopy } from "../_shared/kudos-compose-copy";

import { KudosAnonymousField } from "./kudos-anonymous-field";

const copy = defaultKudosComposeCopy;

const meta = {
  title: "Kudos/KudosAnonymousField",
  component: KudosAnonymousField,
  parameters: { backgrounds: { default: "light" } },
  args: {
    label: copy.anonymousLabel,
    nameLabel: copy.anonymousNameLabel,
    namePlaceholder: copy.anonymousNamePlaceholder,
    onCheckedChange: fn(),
    onNameChange: fn(),
  },
} satisfies Meta<typeof KudosAnonymousField>;

export default meta;

type Story = StoryObj<typeof meta>;

/** mm:G — initial state, checkbox unchecked, name input not in the DOM
 * (C05/C18). */
export const Unchecked: Story = {
  args: {
    checked: false,
    name: "",
  },
};

/** No design node for this state (frame `p9vFVBE_tc` has no node data) —
 * name input mirrors the "Danh hiệu" input box style, see this
 * component's header comment. */
export const Checked: Story = {
  args: {
    checked: true,
    name: "",
  },
};

/** D001 (clarifications.md) — anonymous checked, name left empty, Submit
 * blocked with the error surfaced right at this field. */
export const CheckedWithError: Story = {
  args: {
    checked: true,
    name: "",
    nameError: copy.errorRequired,
  },
};
