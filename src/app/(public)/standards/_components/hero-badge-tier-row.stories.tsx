import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { HERO_TIERS, sampleStandardsCopy } from "../_shared/standards-copy";

import { HeroBadgeTierRow } from "./hero-badge-tier-row";

/**
 * Common component — receives all data via props, no feature copy import
 * (rule 3 in `write-unit-tests-and-storybook-stories`). Story fixtures pull
 * from `standards-copy.ts`'s tables/fixture rather than inventing values.
 */
const meta = {
  title: "Standards/HeroBadgeTierRow",
  component: HeroBadgeTierRow,
} satisfies Meta<typeof HeroBadgeTierRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NewHero: Story = {
  args: {
    tier: HERO_TIERS[0],
    copy: sampleStandardsCopy.heroSection.tiers.newHero,
  },
};

export const LegendHero: Story = {
  args: {
    tier: HERO_TIERS[3],
    copy: sampleStandardsCopy.heroSection.tiers.legendHero,
  },
};
