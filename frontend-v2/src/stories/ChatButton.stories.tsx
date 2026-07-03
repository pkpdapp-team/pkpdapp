import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within, userEvent } from "storybook/test";
import { useDispatch } from "react-redux";
import { useEffect } from "react";

import ChatButton from "../features/chat/ChatButton";
import { openChat, closeChat } from "../features/chat/chatSlice";

const meta: Meta<typeof ChatButton> = {
  title: "Chatbot/ChatButton",
  component: ChatButton,
  parameters: {
    layout: "centered",
  },
};
export default meta;

type Story = StoryObj<typeof ChatButton>;

export const Default: Story = {
  decorators: [
    (Story) => {
      const dispatch = useDispatch();
      useEffect(() => { dispatch(closeChat()); }, []);
      return <Story />;
    },
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const btn = canvas.getByRole("button", { name: /chat/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeEnabled();

    expect(btn).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
  },
};
