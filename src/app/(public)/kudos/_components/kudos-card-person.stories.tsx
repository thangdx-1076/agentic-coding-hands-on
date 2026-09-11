import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { defaultKudosCopy } from "../_shared/kudos-copy";

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
  kudosSent: 5,
  distinctSenders: 5,
};

const senderRisingHero: KudosPerson = {
  ...senderNewHero,
  kudosReceived: 15,
  kudosSent: 15,
  distinctSenders: 15,
};

const receiverSuperHero: KudosPerson = {
  id: "receiver-1",
  fullName: "Huỳnh Dương Xuân",
  avatarUrl: "/kudos/avatar-receiver.png",
  department: "CEVC10",
  kudosReceived: 25,
  kudosSent: 25,
  distinctSenders: 25,
};

const receiverLegendHero: KudosPerson = {
  ...receiverSuperHero,
  kudosReceived: 60,
  kudosSent: 60,
  distinctSenders: 60,
};

const meta = {
  title: "Kudos/KudosCardPerson",
  component: KudosCardPerson,
  args: {
    heroTiers: defaultKudosCopy.heroTiers,
    personHover: defaultKudosCopy.personHover,
  },
} satisfies Meta<typeof KudosCardPerson>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NewHero: Story = {
  args: {
    heroTiers: defaultKudosCopy.heroTiers,
    person: senderNewHero,
    personRole: "sender",
  },
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

/** AD-2 / C25 — anonymous sender: `id === null` is `kudos_cards`' only
 * anonymity signal, and it's the one field this story flips. Avatar,
 * department, and `kudosReceived` are also `null`/`0` here because that is
 * what the view itself returns for an anonymous row — not something this
 * component infers from `id`. Renders the name as plain text, never a
 * `/profile` link. */
export const Anonymous: Story = {
  args: {
    person: {
      id: null,
      fullName: "Một Sunner",
      avatarUrl: null,
      department: null,
      kudosReceived: 0,
      kudosSent: 0,
      distinctSenders: 0,
    },
    personRole: "sender",
  },
};
