import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { store } from "../../app/store";
import { selectCsrf } from "../login/loginSlice";

/**
 * Build the request the Django chatbot endpoint expects from the AI SDK's
 * outgoing message list: the latest message's text, rename
 * "conversationId" to "conversation_id", inject the CSRF header
 */
export function buildChatRequest({
  messages,
  headers,
  body,
  csrf,
}: {
  messages: UIMessage[];
  headers?: Record<string, string>;
  body?: unknown;
  csrf: string;
}): {
  body: { conversation_id: unknown; content: string };
  headers: Record<string, string>;
} {
  const lastMessage = messages.at(-1);
  const content =
    lastMessage?.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") ?? "";

  return {
    body: {
      conversation_id: (body as Record<string, unknown>)?.conversationId,
      content,
    },
    headers: {
      ...headers,
      "X-CSRFToken": csrf,
    },
  };
}

const transport = new DefaultChatTransport({
  api: "/api/chatbot/",
  credentials: "include",
  prepareSendMessagesRequest: ({ messages, headers, body }) =>
    buildChatRequest({
      messages,
      headers: headers as Record<string, string> | undefined,
      body,
      csrf: selectCsrf(store.getState()) ?? "",
    }),
});

export default transport;
