import { DefaultChatTransport } from "ai";

const transport = new DefaultChatTransport({
  api: "/api/chatbot/",
  credentials: "include",
  prepareSendMessagesRequest: ({ messages, headers }) => {
    const csrf = localStorage.getItem("csrf") ?? "";
    const simplified = messages.map((msg) => ({
      role: msg.role,
      content: msg.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("") ?? "",
    }));
    return {
      body: { messages: simplified },
      headers: {
        ...headers,
        "X-CSRFToken": csrf,
      },
    };
  },
});

export default transport;
