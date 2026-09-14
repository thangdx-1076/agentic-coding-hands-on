import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { SecretBoxDialog } from "./secret-box-dialog";

/**
 * Verbatim from the MoMorph frames, not from clarifications.md any more:
 * `titleRevealed` comes from mm:6885:9702 and `instruction` from
 * mm:1466:7683. Both previously held strings that clarifications.md had
 * INFERRED while the reveal state still had no frame to read.
 *
 * Phase 05 owns the real `messages/*.json`-sourced copy; this file stays
 * standalone per the dispatch contract, same as
 * `kudos-link-dialog.stories.tsx` — so it has to be kept in step by hand.
 */
const copy = {
  titleUnopened: "KHÁM PHÁ SECRET BOX CỦA BẠN",
  titleRevealed: "Chúc mừng bạn đã nhận được phần quà từ BTC SAA 2025",
  instruction: "Click vào box để mở",
  label: "Secretbox chưa mở",
  close: "Đóng",
};

const meta = {
  title: "Kudos/SecretBoxDialog",
  component: SecretBoxDialog,
  parameters: { backgrounds: { default: "dark" } },
  args: {
    copy,
    onOpenBox: fn(),
    onClose: fn(),
    onCancel: fn(),
    // Preview-only stand-in for phase-05's hook: opens the real modal (with
    // `::backdrop`) once, imperatively, guarded so it never re-fires on a
    // node that's already open (same pattern as `kudos-link-dialog.stories.tsx`).
    registerDialog: (node: HTMLDialogElement | null) => {
      if (node && !node.open) node.showModal();
    },
  },
} satisfies Meta<typeof SecretBoxDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Freshly opened, 1 box unopened, nothing awarded yet — S03-S06. */
export const Unopened: Story = {
  args: {
    state: "unopened",
    unopenedCount: 1,
    awardedBadgeKey: null,
    canOpen: true,
    busy: false,
  },
};

/** Just opened the last box: title flips, instruction hides (count 0),
 * badge appears at its untouched 64×64 (S07-S10, BR-004). */
export const Revealed: Story = {
  args: {
    state: "revealed",
    unopenedCount: 0,
    awardedBadgeKey: "stay-gold",
    canOpen: false,
    busy: false,
  },
};

/** Opened one of several: instruction stays visible (it only
 * makes sense with boxes remaining), box stays clickable. */
export const RevealedWithBoxesLeft: Story = {
  args: {
    state: "revealed",
    unopenedCount: 3,
    awardedBadgeKey: "root-further",
    canOpen: true,
    busy: false,
  },
};
