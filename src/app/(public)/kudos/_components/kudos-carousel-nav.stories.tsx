import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { KudosCarouselNav } from "./kudos-carousel-nav";
import { KudosSlideCounter } from "./kudos-slide-counter";

const meta = {
  title: "Kudos/KudosCarouselNav",
  component: KudosCarouselNav,
  args: {
    prevLabel: "Xem kudo trước",
    nextLabel: "Xem kudo tiếp theo",
    onPrev: () => {},
    onNext: () => {},
  },
  parameters: {
    backgrounds: { default: "dark" },
  },
} satisfies Meta<typeof KudosCarouselNav>;

export default meta;

type Story = StoryObj<typeof meta>;

/** `B.2.1`/`B.2.2` — 80px hit target, 60px icon, absolute-positioned at
 * the edges of a relative carousel track. */
export const CardPlacement: Story = {
  args: { placement: "card", canPrev: false, canNext: true },
  render: (args) => (
    <div className="relative h-55 w-225 bg-login-background">
      <KudosCarouselNav {...args} />
    </div>
  ),
};

/** `B.5.1`/`B.5.3` — 48px hit target, 28px icon, flanking the slide
 * counter in one row. */
export const CounterPlacement: Story = {
  args: { placement: "counter", canPrev: true, canNext: true },
  render: (args) => (
    <div className="bg-login-background p-6">
      <KudosCarouselNav {...args}>
        <KudosSlideCounter index={1} count={5} />
      </KudosCarouselNav>
    </div>
  ),
};

/** Slide 1 of 5: prev disabled, next enabled (C12). */
export const CounterFirstSlide: Story = {
  args: { placement: "counter", canPrev: false, canNext: true },
  render: (args) => (
    <div className="bg-login-background p-6">
      <KudosCarouselNav {...args}>
        <KudosSlideCounter index={0} count={5} />
      </KudosCarouselNav>
    </div>
  ),
};

/** Slide 5 of 5: next disabled, prev enabled (C12). */
export const CounterLastSlide: Story = {
  args: { placement: "counter", canPrev: true, canNext: false },
  render: (args) => (
    <div className="bg-login-background p-6">
      <KudosCarouselNav {...args}>
        <KudosSlideCounter index={4} count={5} />
      </KudosCarouselNav>
    </div>
  ),
};
