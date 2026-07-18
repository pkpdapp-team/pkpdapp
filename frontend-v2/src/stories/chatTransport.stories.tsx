import { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import type { UIMessage } from "ai";

import { buildChatRequest } from "../features/chat/chatTransport";

// These tests have no UI; they exercise the pure request-building logic the
// chat transport uses to translate AI SDK messages into the payload the Django
// chatbot endpoint expects.
const ChatTransportTests = () => <div>Chat transport tests</div>;

const meta: Meta<typeof ChatTransportTests> = {
  title: "Chatbot/Chat Transport",
  component: ChatTransportTests,
};

export default meta;
type Story = StoryObj<typeof meta>;

function userMessage(...texts: string[]): UIMessage {
  return {
    id: "1",
    role: "user",
    parts: texts.map((text) => ({ type: "text", text })),
  };
}

// Only the newest message is sent, conversationId is renamed to snake_case,
// and the CSRF header is injected.
export const BuildsRequestFromLatestMessage: Story = {
  play: async () => {
    const req = buildChatRequest({
      messages: [userMessage("first"), userMessage("second")],
      body: { conversationId: 42 },
      csrf: "tok",
    });

    expect(req.body.content).toBe("second");
    expect(req.body.conversation_id).toBe(42);
    expect(req.headers["X-CSRFToken"]).toBe("tok");
  },
};

// Multiple text parts of the latest message are concatenated.
export const JoinsMultipleTextParts: Story = {
  play: async () => {
    const req = buildChatRequest({
      messages: [userMessage("Hello ", "world")],
      body: {},
      csrf: "",
    });

    expect(req.body.content).toBe("Hello world");
  },
};

// No messages / no body: content is empty and conversation_id is undefined,
// but the CSRF header is still set.
export const HandlesEmptyInput: Story = {
  play: async () => {
    const req = buildChatRequest({ messages: [], body: undefined, csrf: "x" });

    expect(req.body.content).toBe("");
    expect(req.body.conversation_id).toBeUndefined();
    expect(req.headers["X-CSRFToken"]).toBe("x");
  },
};

// Existing headers are preserved and merged with the CSRF header.
export const MergesExistingHeaders: Story = {
  play: async () => {
    const req = buildChatRequest({
      messages: [userMessage("hi")],
      headers: { "Content-Type": "application/json" },
      body: { conversationId: 7 },
      csrf: "abc",
    });

    expect(req.headers["Content-Type"]).toBe("application/json");
    expect(req.headers["X-CSRFToken"]).toBe("abc");
  },
};
