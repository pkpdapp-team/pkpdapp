import { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import type { UIMessage } from "ai";

import { buildChatRequest } from "../features/chat/chatTransport";
import { PageName, SubPageName } from "../features/main/mainSlice";

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

export const BuildsRequestFromLatestMessage: Story = {
  play: async () => {
    const req = buildChatRequest({
      messages: [userMessage("first"), userMessage("second")],
      body: { conversation_id: 42 },
      csrf: "tok",
    });

    expect(req.body.content).toBe("second");
    expect(req.body.conversation_id).toBe(42);
    expect(req.headers["X-CSRFToken"]).toBe("tok");
  },
};

export const IncludesContext: Story = {
  play: async () => {
    const req = buildChatRequest({
      messages: [userMessage("Explain these parameters")],
      body: {
        conversation_id: 42,
        context: {
          page: PageName.MODEL,
          sub_page: SubPageName.PARAMETERS,
        },
      },
      csrf: "tok",
    });

    expect(req.body).toEqual({
      conversation_id: 42,
      content: "Explain these parameters",
      context: {
        page: "Model",
        sub_page: "Parameters",
      },
    });
  },
};

// Multiple text parts of the latest message are concatenated.
export const JoinsMultipleTextParts: Story = {
  play: async () => {
    const req = buildChatRequest({
      messages: [userMessage("Hello ", "world")],
      body: { conversation_id: 42 },
      csrf: "",
    });

    expect(req.body.content).toBe("Hello world");
  },
};

export const RequiresConversationId: Story = {
  play: async () => {
    expect(() =>
      buildChatRequest({ messages: [], body: undefined, csrf: "x" }),
    ).toThrow("A conversation ID is required");
  },
};

// Existing headers are preserved and merged with the CSRF header.
export const MergesExistingHeaders: Story = {
  play: async () => {
    const req = buildChatRequest({
      messages: [userMessage("hi")],
      headers: { "Content-Type": "application/json" },
      body: { conversation_id: 7 },
      csrf: "abc",
    });

    expect(req.headers["Content-Type"]).toBe("application/json");
    expect(req.headers["X-CSRFToken"]).toBe("abc");
  },
};
