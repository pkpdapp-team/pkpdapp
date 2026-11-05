import { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import {
  buildChatRequest,
  type ChatUIMessage,
  DEFAULT_CHAT_ERROR,
  getChatError,
} from "../features/chat/chatTransport";
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

function userMessage(...texts: string[]): ChatUIMessage {
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
export const SendsMessageKind: Story = {
  play: async () => {
    const message: ChatUIMessage = {
      ...userMessage("fit"),
      metadata: { kind: "quick_fit" },
    };
    const req = buildChatRequest({
      messages: [message],
      body: { conversation_id: 42 },
      csrf: "tok",
    });

    expect(req.body.kind).toBe("quick_fit");
  },
};

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

export const ShowsMonthlyLimitError: Story = {
  play: async () => {
    const body = {
      error: "You've reached your monthly AI assistant usage limit.",
      code: "monthly_limit_reached",
      reset_date: "2026-11-01",
    };

    expect(getChatError(new Error(JSON.stringify(body)))).toEqual({
      message: body.error,
      isLimitReached: true,
    });
  },
};

export const ShowsUserFacingBackendError: Story = {
  play: async () => {
    const error = new Error(
      JSON.stringify({
        error: "The AI assistant is temporarily unavailable.",
        code: "pricing_unavailable",
      }),
    );

    expect(getChatError(error)).toEqual({
      message: "The AI assistant is temporarily unavailable.",
      isLimitReached: false,
    });
  },
};

// Errors without a code (e.g. serializer validation) aren't user-facing.
export const HidesInternalBackendErrors: Story = {
  play: async () => {
    const error = new Error(
      JSON.stringify({
        error: "{'content': [ErrorDetail(string='blank', code='blank')]}",
      }),
    );

    expect(getChatError(error)).toEqual({
      message: DEFAULT_CHAT_ERROR,
      isLimitReached: false,
    });
  },
};

export const FallsBackToGenericError: Story = {
  play: async () => {
    expect(getChatError(new Error("Failed to fetch"))).toEqual({
      message: DEFAULT_CHAT_ERROR,
      isLimitReached: false,
    });
  },
};
