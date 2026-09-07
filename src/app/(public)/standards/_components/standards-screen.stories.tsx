import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { sampleStandardsCopy } from "../_shared/standards-copy";

import { StandardsScreen } from "./standards-screen";

/**
 * Story route for `/standards` (F005_StandardsRulesPage) — dựng từ
 * `StandardsScreen`, component trình bày thuần. Repo quy ước mỗi route
 * chính có 1 story dựng từ component trình bày (`/` → `HomeScreen`,
 * `/awards` → `AwardsScreen`), dù `StandardsScreen` là composition
 * component không bắt buộc theo skill.
 */
const meta = {
  title: "Screens/StandardsScreen",
  component: StandardsScreen,
  args: {
    copy: sampleStandardsCopy,
    onClose: () => {
      // no-op for Storybook — the real page uses useStandardsClose's handleClose
    },
  },
} satisfies Meta<typeof StandardsScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
