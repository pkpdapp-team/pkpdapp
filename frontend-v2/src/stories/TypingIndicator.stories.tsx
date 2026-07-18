import type { Meta, StoryObj } from "@storybook/react-vite";

import TypingIndicator from "../features/chat/TypingIndicator";

const meta = {
  title: "Chatbot/TypingIndicator",
  component: TypingIndicator,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof TypingIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
