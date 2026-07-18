import { expect, fn, userEvent, within } from "storybook/test";
import type { Meta, StoryObj } from '@storybook/react-vite';

import ChatInput from '../features/chat/ChatInput';

const meta = {
  title: "Chatbot/ChatInput",
  component: ChatInput,
} satisfies Meta<typeof ChatInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    "value": "",
    "onChange": fn(),
    "onSend": fn(),
    "onStop": fn(),
    "isLoading": false
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox");
    expect(input).toHaveValue("");

    // Test that the send button is disabled when there is no text in the input
    const sendButton = canvas.getByRole("button", { name: /send message/i });
    expect(sendButton).toBeDisabled();

    // Test that the stop button is not present when isLoading is false
    await step("stop button is not rendered when isLoading is false (i.e when streaming is not happening)", () => {
      const stopButton = canvas.queryByRole("button", { name: /stop generating/i });
      expect(stopButton).not.toBeInTheDocument();
    });
  }
};

export const WithValue: Story = {
  args: {
    "value": "PKPD modeling",
    "onChange": fn(),
    "onSend": fn(),
    "onStop": fn(),
    "isLoading": false
  },
  play: async ({ canvasElement, args, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox");
    expect(input).toHaveValue("PKPD modeling");

    // Test that the send button is enabled when there is text in the input
    const sendButton = canvas.getByRole("button", { name: /send message/i });
    expect(sendButton).toBeEnabled();

    // Test that the stop button is not present when isLoading is false
    await step("stop button is not rendered when isLoading is false (i.e when streaming is not happening)", () => {
      const stopButton = canvas.queryByRole("button", { name: /stop generating/i });
      expect(stopButton).not.toBeInTheDocument();
    });

    // Test that Shift+Enter does not send the message (allows multiline input)
    await step("Shift+Enter does not fire onSend", async () => {
      await userEvent.type(input, "{Shift>}{Enter}{/Shift}");
      expect(args.onSend).not.toHaveBeenCalled();
    });

    // Test that Enter sends the message when there is text and it is not disabled
    await step("Enter fires onSend", async () => {
      await userEvent.type(input, "{Enter}");
      expect(args.onSend).toHaveBeenCalled();
    });
  }
};

export const Loading: Story = {
  args: {
    "value": "",
    "onChange": fn(),
    "onSend": fn(),
    "onStop": fn(),
    "isLoading": true
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox");
    expect(input).toHaveValue("");

    // Test that the send button is disabled when isLoading is true
    await step("send button is not rendered when isLoading is true", () => {
      const sendButton = canvas.queryByRole("button", { name: /send message/i });
      expect(sendButton).not.toBeInTheDocument();
    });

    // Test that the stop button is present when isLoading is true
    const stopButton = canvas.getByRole("button", { name: /stop generating/i });
    expect(stopButton).toBeInTheDocument();
  }
};

export const Disabled: Story = {
  args: {
    "value": "",
    "onChange": fn(),
    "onSend": fn(),
    "onStop": fn(),
    "isLoading": false,
    "disabled": true
  },
  play: async ({ canvasElement, args, step }) => {
    const canvas = within(canvasElement);


    const sendButton = canvas.queryByRole("button", { name: /send message/i });
    expect(sendButton).toBeDisabled();



    await step("stop button is not rendered when disabled", () => {
      expect(
        canvas.queryByRole("button", { name: /stop generating/i }),
      ).not.toBeInTheDocument();
    });

    // Test that Enter does not fire onSend when the input is disabled
    await step("Enter does not fire onSend when disabled", async () => {
      const input = canvas.getByRole("textbox");
      await userEvent.type(input, "{Enter}");
      expect(args.onSend).not.toHaveBeenCalled();
    });
  }
};