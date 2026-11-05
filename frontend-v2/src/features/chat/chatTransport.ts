import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import type {
  ChatbotErrorResponse,
  ChatbotLimitResponse,
  ChatbotRequest,
  KindEnum,
} from "../../app/backendApi";
import { store } from "../../app/store";
import { selectCsrf } from "../login/loginSlice";

export type ChatTransportBody = Omit<ChatbotRequest, "content" | "kind">;
export type ChatUIMessage = UIMessage<{ kind?: KindEnum }>;

/** Build the Django request for the latest chat message. */
export function buildChatRequest({
  messages,
  headers,
  body,
  csrf,
}: {
  messages: ChatUIMessage[];
  headers?: Record<string, string>;
  body?: ChatTransportBody;
  csrf: string;
}) {
  const conversationId = body?.conversation_id;
  if (conversationId === undefined) {
    throw new Error("A conversation ID is required");
  }

  const lastMessage = messages.at(-1);
  const content =
    lastMessage?.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("") ?? "";
  const requestHeaders: Record<string, string> = {
    ...headers,
    "X-CSRFToken": csrf,
  };

  const requestBody: ChatbotRequest = {
    conversation_id: conversationId,
    content,
    context: body?.context,
    kind: lastMessage?.metadata?.kind,
  };

  return {
    body: requestBody,
    headers: requestHeaders,
  };
}

export const DEFAULT_CHAT_ERROR = "Failed to get a response. Please try again.";

export type ChatError = {
  message: string;
  isLimitReached: boolean;
};

/**
 * Turn a useChat error into a message for the user. For non-OK responses the
 * AI SDK throws an Error whose message is the response body. Django sets
 * `code` on errors whose message is meant for the user; anything else gets a
 * generic message.
 */
export function getChatError(error: Error): ChatError {
  try {
    const body: Partial<ChatbotErrorResponse & ChatbotLimitResponse> =
      JSON.parse(error.message);
    if (body?.code && typeof body.error === "string" && body.error) {
      return {
        message: body.error,
        isLimitReached: body.code === "monthly_limit_reached",
      };
    }
  } catch {
    // Not a JSON error body (e.g. a network failure).
  }
  return { message: DEFAULT_CHAT_ERROR, isLimitReached: false };
}

const transport = new DefaultChatTransport<ChatUIMessage>({
  api: "/api/chatbot/",
  credentials: "include",
  prepareSendMessagesRequest: ({ messages, headers, body }) =>
    buildChatRequest({
      messages,
      headers: headers as Record<string, string> | undefined,
      body: body as ChatTransportBody | undefined,
      csrf: selectCsrf(store.getState()) ?? "",
    }),
});

export default transport;
