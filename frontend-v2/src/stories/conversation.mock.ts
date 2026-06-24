import { http, HttpResponse, delay } from "msw";
import { ConversationRead } from "../app/backendApi";

export const conversations: ConversationRead[] = [
  {
    id: 1,
    project: 57,
    title: "Clearance estimation",
    created_at: "2025-06-01T09:00:00Z",
    updated_at: "2025-06-01T09:30:00Z",
    last_message_preview: "How is clearance estimated?",
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
];
