import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import { http, HttpResponse } from "msw";

import DocumentList from "../features/chat/DocumentList";
import { documentHandlers, documents } from "./document.mock";

const onBack = fn();
const deleteSpy = fn();
const uploadSpy = fn();

const meta: Meta<typeof DocumentList> = {
  title: "Chatbot/DocumentList",
  component: DocumentList,
  args: { projectId: 57, projectName: "model parameters", onBack },
  parameters: {
    msw: {
      handlers: {
        documents: [
          documentHandlers[0],
          http.delete("/api/documents/:id/", async ({ params }) => {
            deleteSpy(params.id);
            return new HttpResponse(null, { status: 204 });
          }),
          http.post("/api/documents/", async ({ request }) => {
            const form = await request.formData();
            uploadSpy((form.get("file") as File).name, form.get("project"));
            return HttpResponse.json(
              { ...documents[0], id: 3, filename: "new.pdf" },
              { status: 201 },
            );
          }),
        ],
      },
    },
  },
  beforeEach: () => {
    onBack.mockClear();
    deleteSpy.mockClear();
    uploadSpy.mockClear();
  },
};
export default meta;

type Story = StoryObj<typeof DocumentList>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("Project: model parameters")).toBeInTheDocument();
    expect(await canvas.findByText("pk-guidelines.pdf")).toBeInTheDocument();
    expect(canvas.getByText("Ready · 42 chunks")).toBeInTheDocument();
    expect(canvas.getByText("broken.pdf")).toBeInTheDocument();
    expect(
      canvas.getByText("Failed: Could not extract text"),
    ).toBeInTheDocument();
    expect(canvas.getByRole("button", { name: "Retry" })).toBeInTheDocument();

    await userEvent.click(
      canvas.getByRole("button", { name: /back to chat/i }),
    );
    expect(onBack).toHaveBeenCalledTimes(1);
  },
};

export const Upload: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("pk-guidelines.pdf");
    const file = new File(["%PDF-1.4"], "new.pdf", {
      type: "application/pdf",
    });
    await userEvent.upload(canvas.getByLabelText("Upload PDF document"), file);
    await waitFor(() =>
      expect(uploadSpy).toHaveBeenCalledWith("new.pdf", "57"),
    );
  },
};

export const Delete: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("pk-guidelines.pdf");
    await userEvent.click(
      canvas.getByRole("button", { name: "Options for pk-guidelines.pdf" }),
    );
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Delete document" }),
    );
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: /delete|confirm|yes/i }),
    );
    await waitFor(() => expect(deleteSpy).toHaveBeenCalledWith("1"));
  },
};

export const Empty: Story = {
  args: { projectId: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(await canvas.findByText("No documents yet")).toBeInTheDocument();
    expect(canvas.getByRole("button", { name: "Add document" })).toBeDisabled();
  },
};
