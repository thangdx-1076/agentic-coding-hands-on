import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PrelaunchScreen } from "./prelaunch-screen";

import { CountdownTiles } from "@/components/countdown-tiles";

/**
 * Story route cho `/prelaunch` (F011 / SCR009) — `PrelaunchScreen` là
 * component trình bày thuần, mọi prop có default (`countdown` tự rơi về
 * trạng thái "00/00/00" khi không truyền) nên render standalone không cần
 * Server Component `page.tsx` (async, Storybook không render được).
 */
const meta = {
  title: "Screens/PrelaunchScreen",
  component: PrelaunchScreen,
  args: {
    title: "Sự kiện sẽ bắt đầu sau",
  },
} satisfies Meta<typeof PrelaunchScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Zero-state (mm:2268:35127) — dùng fallback nội bộ của `PrelaunchScreen`. */
export const Default: Story = {};

/**
 * Trạng thái sống — chứng minh `days` không bị kẹp ở 2 chữ số khi mốc sự
 * kiện còn xa, giống `countdown-tiles.stories.tsx` § `Live`.
 */
export const Live: Story = {
  args: {
    countdown: (
      <CountdownTiles
        days="120"
        hours="05"
        minutes="32"
        daysLabel="DAYS"
        hoursLabel="HOURS"
        minutesLabel="MINUTES"
      />
    ),
  },
};
