import { http, HttpResponse, delay } from "msw";
import { ConversationRead, MessageRead } from "../app/backendApi";

export const conversations: ConversationRead[] = [
  {
    id: 1,
    project: 57,
    title: "Clearance estimation",
    created_at: "2025-06-01T09:00:00Z",
    updated_at: "2025-06-01T09:30:00Z",
    last_message_preview: "How is clearance estimated?",
  },
  {
    id: 2,
    project: 57,
    title: "Volume of distribution",
    created_at: "2025-06-02T14:00:00Z",
    updated_at: "2025-06-02T14:15:00Z",
    last_message_preview: "What drives the central compartment volume?",
  },
];

export const conversationHandlers = [
  http.get("/api/conversations/", async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const projectId = url.searchParams.get("project_id");
    if (projectId) {
      return HttpResponse.json(conversations, { status: 200 });
    }
    return HttpResponse.json([], { status: 200 });
  }),
  http.delete("/api/conversations/:id/", async () => {
    await delay();
    return new HttpResponse(null, { status: 204 });
  }),
];

// Stored messages for a single conversation, used by the ChatPanel stories.
export const messages: MessageRead[] = [
  {
    id: 1,
    role: "user",
    content: "How is clearance estimated?",
    created_at: "2025-06-01T09:00:00Z",
  },
  {
    id: 2,
    role: "assistant",
    content: "Clearance is estimated from the dose and concentration data.",
    created_at: "2025-06-01T09:00:05Z",
  },
];

export const messageHandlers = [
  http.get("/api/messages/", async () => {
    await delay();
    return HttpResponse.json(messages, { status: 200 });
  }),
];
