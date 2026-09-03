import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { store } from "../../app/store";
import { selectCsrf } from "../login/loginSlice";
import type { PageName, SubPageName } from "../main/mainSlice";

export interface ChatTransportBody {
  conversationId?: number;
  context?: {
    page: PageName;
    subPage: SubPageName | null;
  };
}

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
  const browserContext = body?.context;
  const lastMessage = messages.at(-1);
  const content =
    lastMessage?.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") ?? "";
  const requestHeaders: Record<string, string> = {
    ...headers,
    "X-CSRFToken": csrf,
  };

  return {
    body: {
      conversation_id: body?.conversationId,
      content,
      ...(browserContext
        ? {
            context: {
              page: browserContext.page,
              sub_page: browserContext.subPage,
            },
          }
        : {}),
    },
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
      body,
      csrf: selectCsrf(store.getState()) ?? "",
    }),
});

export default transport;
