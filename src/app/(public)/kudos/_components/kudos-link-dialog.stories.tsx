import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import { KudosLinkDialog } from "./kudos-link-dialog";

/**
 * Vi copy literal straight from the design (clarifications.md § "Chữ label
 * 'Text'/'Link' (spec) hay 'Nội dung'/'URL' (design)"). Phase 02 owns
 * `kudos-compose-copy.ts`'s real `linkDialog` slice — this file stays
 * standalone per the dispatch contract, so the literal is duplicated here
 * rather than imported.
 */
const copy = {
  title: "Thêm đường dẫn",
  textLabel: "Nội dung",
  urlLabel: "URL",
  cancel: "Hủy",
  save: "Lưu",
};

const meta = {
  title: "Kudos/KudosLinkDialog",
  component: KudosLinkDialog,
  parameters: { backgrounds: { default: "dark" } },
  args: {
    copy,
    onTextChange: fn(),
    onUrlChange: fn(),
    onUrlBlur: fn(),
    onSave: fn(),
    onCancelClick: fn(),
    onCancel: fn(),
    // Preview-only stand-in for phase-02's hook: opens the real modal (with
    // `::backdrop`) once, imperatively, the same way the hook will —
    // `showModal()` on the node this ref callback receives, guarded so it
    // never re-fires on a node that's already open (same pattern as
    // `kudos-compose-dialog.stories.tsx`).
    registerDialog: (node: HTMLDialogElement | null) => {
      if (node && !node.open) node.showModal();
    },
  },
} satisfies Meta<typeof KudosLinkDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Freshly opened — both fields empty, no errors (L01/L10). */
export const Empty: Story = {
  args: {
    text: "",
    url: "",
    textError: null,
    urlError: null,
  },
};

/** After clicking Lưu with an invalid draft — text required error + URL
 * protocol error visible under each field, dialog stays open (L04/L07). */
export const WithErrors: Story = {
  args: {
    text: "",
    url: "ftp://x.com",
    textError: "Không được để trống.",
    urlError: "URL không hợp lệ — chỉ nhận http hoặc https.",
  },
};

/** Selected textarea text prefilled the text input, URL already valid
 * (L08/L09 test data). */
export const Prefilled: Story = {
  args: {
    text: "Sample Link",
    url: "https://www.example.com",
    textError: null,
    urlError: null,
  },
};
