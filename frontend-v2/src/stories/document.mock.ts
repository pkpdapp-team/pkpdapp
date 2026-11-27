import { http, HttpResponse, delay } from "msw";
import { DocumentRead } from "../app/backendApi";

export const documents: DocumentRead[] = [
  {
    id: 1,
    filename: "pk-guidelines.pdf",
    project: 57,
    created_at: "2025-06-01T09:00:00Z",
    status: "ready",
    error: "",
    chunk_count: 42,
  },
  {
    id: 2,
    filename: "broken.pdf",
    project: 57,
    created_at: "2025-06-02T14:00:00Z",
    status: "failed",
    error: "Could not extract text",
    chunk_count: null,
  },
];

export const documentHandlers = [
  http.get("/api/documents/", async ({ request }) => {
    await delay();
    const projectId = new URL(request.url).searchParams.get("project_id");
    return HttpResponse.json(projectId ? documents : [], { status: 200 });
  }),
  http.delete("/api/documents/:id/", async () => {
    await delay();
    return new HttpResponse(null, { status: 204 });
  }),
  http.post("/api/documents/", async () => {
    await delay();
    return HttpResponse.json(
      { ...documents[0], id: 3, filename: "new.pdf", status: "processing" },
      { status: 201 },
    );
  }),
];
