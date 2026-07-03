import { DefaultChatTransport } from "ai";
import { store } from "../../app/store";
import { selectCsrf } from "../login/loginSlice";

const transport = new DefaultChatTransport({
  api: "/api/chatbot/",
  credentials: "include",
  prepareSendMessagesRequest: ({ messages, headers, body }) => {
    const csrf = selectCsrf(store.getState()) ?? "";
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
  },
});

export default transport;
