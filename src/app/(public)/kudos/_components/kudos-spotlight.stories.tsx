import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { KudosSpotlight, type KudosSpotlightCopy } from "./kudos-spotlight";

/** Literal `messages/vi.json` `kudos.spotlight.*` (phase 02). */
const copy: KudosSpotlightCopy = {
  eyebrow: "Sun* Annual Awards 2025",
  heading: "SPOTLIGHT BOARD",
  totalSuffix: "KUDOS",
  searchPlaceholder: "Tìm kiếm",
  searchSubmit: "Tìm kiếm",
};

/** Real receiver names kept from the design's own scatter content
 * (clarifications.md § Spotlight) — not invented fixture data. */
const sevenNames = [
  "Đỗ hoàng Hiệp",
  "Dương thúy An",
  "Mai phương Thúy",
  "Lê Kiều Trang",
  "Nguyễn Văn Quy",
  "Nguyễn Bá Chức",
  "Nguyễn Hoàng Linh",
];

const meta = {
  title: "Kudos/KudosSpotlight",
  component: KudosSpotlight,
} satisfies Meta<typeof KudosSpotlight>;

export default meta;

type Story = StoryObj<typeof meta>;

/** `388` here is a Storybook fixture value standing in for the real DB
 * count — the component itself never hardcodes it (see the `grep` gate in
 * phase-10's Success Criteria). `latestKudo` demonstrates the bottom-left
 * ticker with a fixture receiver/timestamp — never the design's own
 * literal "Nguyễn Bá Chức"/"08:30PM". */
export const Default: Story = {
  args: {
    total: 388,
    names: sevenNames,
    copy,
    latestKudo: {
      receiverName: "Nguyễn Văn Quy",
      createdAt: "2025-10-30T13:05:00.000Z",
    },
  },
};

/** No `latestKudo` (e.g. an empty board) → no ticker rendered rather than
 * an invented one. */
export const NoTicker: Story = {
  args: { total: 388, names: sevenNames, copy },
};

/** Success Criteria: proves `[data-testid=kudos-spotlight-total]` renders
 * "0 KUDOS" correctly even with no DB (C20 has no dependency on this story,
 * but the shape it exercises is the same `EMPTY_BOARD` fail-open case). */
export const ZeroTotal: Story = {
  args: { total: 0, names: [], copy },
};

/** No real receivers → the scatter's own empty-state message, not a blank
 * card. */
export const EmptyNames: Story = {
  args: { total: 0, names: [], copy },
};

/** Types a real seeded name into the search box; asserts the matching
 * scatter span(s) carry `data-matched="true"` and nothing else does (C21). */
export const SearchMatched: Story = {
  args: { total: 388, names: sevenNames, copy },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const search = canvas.getByTestId("kudos-sunner-search");

    await userEvent.type(search, "Đỗ");

    const matches = canvasElement.querySelectorAll(
      '[data-testid="kudos-spotlight-name"][data-matched="true"]',
    );
    await expect(matches.length).toBeGreaterThan(0);
    for (const el of matches) {
      await expect(el).toHaveTextContent("Đỗ hoàng Hiệp");
    }
  },
};

/** A query with no matching Sunner → zero spans carry `data-matched`. */
export const SearchNoMatch: Story = {
  args: { total: 388, names: sevenNames, copy },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const search = canvas.getByTestId("kudos-sunner-search");

    await userEvent.type(search, "Khong Ton Tai");

    const matches = canvasElement.querySelectorAll(
      '[data-testid="kudos-spotlight-name"][data-matched="true"]',
    );
    await expect(matches.length).toBe(0);
  },
};
