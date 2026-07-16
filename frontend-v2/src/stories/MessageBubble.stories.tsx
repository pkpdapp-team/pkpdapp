import { expect, within } from "storybook/test";
import type { Meta, StoryObj } from "@storybook/react-vite";

import MessageBubble from "../features/chat/MessageBubble";

const meta = {
  title: "Chatbot/MessageBubble",
  component: MessageBubble,
} satisfies Meta<typeof MessageBubble>;

export default meta;

type Story = StoryObj<typeof meta>;

export const UserMessage: Story = {
  args: {
    parts: [{ type: "text", text: "How is clearance estimated?" }],
    isUser: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("How is clearance estimated?")).toBeInTheDocument();
  },
};

export const AssistantMessage: Story = {
  args: {
    parts: [{ type: "text", text: "Clearance is estimated from the **dose** and concentration data." }],
    isUser: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const paragraph = canvas.getByText(/Clearance is estimated/i);
    expect(paragraph).toBeInTheDocument();
    // Markdown emphasis should be rendered as bold text
    expect(canvas.getByText("dose")).toBeInTheDocument();
    // When not streaming, the blinking cursor must NOT be present
    const after = getComputedStyle(paragraph, "::after");
    expect(after.content).not.toContain("▋");
  },
};

export const StreamingAssistant: Story = {
  args: {
    parts: [{ type: "text", text: "Calculating the result" }],
    isUser: false,
    isStreaming: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // getByText returns the rendered <p>, which is the last child the
    // cursor's `::after` pseudo-element is attached to while streaming.
    const paragraph = canvas.getByText(/Calculating the result/i);
    expect(paragraph).toBeInTheDocument();
    // The blinking cursor is a CSS `::after` pseudo-element, so it is not in
    // the DOM — assert it via the computed style of the pseudo-element.
    const after = getComputedStyle(paragraph, "::after");
    expect(after.content).toContain("▋");
  },
};
