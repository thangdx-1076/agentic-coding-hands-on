import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { KudosCardPerson } from "./kudos-card-person";

import type { KudosPerson } from "@/dal/kudos";

/**
 * Names/department copied verbatim from the frame (`get_design_item_image`
 * on `3127:21871`/`2940:13465`) — sender "Huỳnh Dương Xuân Nhật", receiver
 * "Huỳnh Dương Xuân", both "CEVC10". `kudosReceived` values are fixture
 * numbers chosen only to land in each `starTier()` bracket (10/20/50); the
 * number itself is never rendered by this component.
 */
const senderNewHero: KudosPerson = {
  id: "sender-1",
  fullName: "Huỳnh Dương Xuân Nhật",
  avatarUrl: "/kudos/avatar-sender.png",
  department: "CEVC10",
  kudosReceived: 5,
};

const senderRisingHero: KudosPerson = {
  ...senderNewHero,
  kudosReceived: 15,
};

const receiverSuperHero: KudosPerson = {
  id: "receiver-1",
  fullName: "Huỳnh Dương Xuân",
  avatarUrl: "/kudos/avatar-receiver.png",
  department: "CEVC10",
  kudosReceived: 25,
};

const receiverLegendHero: KudosPerson = {
  ...receiverSuperHero,
  kudosReceived: 60,
};

const meta = {
  title: "Kudos/KudosCardPerson",
  component: KudosCardPerson,
} satisfies Meta<typeof KudosCardPerson>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NewHero: Story = {
  args: { person: senderNewHero, personRole: "sender" },
};

export const RisingHero: Story = {
  args: { person: senderRisingHero, personRole: "sender" },
};

export const SuperHero: Story = {
  args: { person: receiverSuperHero, personRole: "receiver" },
};

export const LegendHero: Story = {
  args: { person: receiverLegendHero, personRole: "receiver" },
};

export const NoAvatarNoDepartment: Story = {
  args: {
    person: { ...senderNewHero, avatarUrl: null, department: null },
    personRole: "sender",
  },
};
