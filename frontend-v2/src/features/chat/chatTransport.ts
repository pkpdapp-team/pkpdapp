import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import type { ChatbotRequest } from "../../app/backendApi";
import { store } from "../../app/store";
import { selectCsrf } from "../login/loginSlice";

export type ChatTransportBody = Omit<ChatbotRequest, "content">;

/** Build the Django request for the latest chat message. */
export function buildChatRequest({
  messages,
  headers,
  body,
  csrf,
}: {
  messages: UIMessage[];
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
  };

  return {
    body: requestBody,
    headers: requestHeaders,
  };
}

const transport = new DefaultChatTransport({
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
