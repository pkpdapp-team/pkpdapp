import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import { http, HttpResponse } from "msw";

import ConversationList from "../features/chat/ConversationList";
import { conversationHandlers, conversations } from "./conversation.mock";

const onSelect = fn();
const onNew = fn();
const onBack = fn();

const meta: Meta<typeof ConversationList> = {
  title: "Chatbot/ConversationList",
  component: ConversationList,
  args: {
    projectId: 57,
    projectName: "model parameters",
    activeConversationId: null,
    onSelect,
    onNew,
    onBack,
  },
  parameters: {
    msw: {
      handlers: {
        conversations: conversationHandlers,
      },
    },
  },
  beforeEach: () => {
    onSelect.mockClear();
    onNew.mockClear();
    onBack.mockClear();
  },
};
export default meta;

type Story = StoryObj<typeof ConversationList>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    expect(canvas.getByText("Project: model parameters")).toBeInTheDocument();

    expect(
      await canvas.findByText(conversations[0].title!),
    ).toBeInTheDocument();
    expect(canvas.getByText(conversations[1].title!)).toBeInTheDocument();

    expect(
      canvas.getByText(conversations[0].last_message_preview!),
    ).toBeInTheDocument();
    expect(
      canvas.getByText(conversations[1].last_message_preview!),
    ).toBeInTheDocument();

    const newButton = canvas.getByRole("button", {
      name: "New conversation",
    });
    expect(newButton).toBeEnabled();
  },
};

export const Interactions: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByRole("button", { name: "New conversation" }),
    );
    expect(onNew).toHaveBeenCalledTimes(1);

    await userEvent.click(await canvas.findByText(conversations[1].title!));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(conversations[1].id);

    await userEvent.click(
      canvas.getByRole("button", { name: /back to chat/i }),
    );
    expect(onBack).toHaveBeenCalledTimes(1);
  },
};

export const ActiveConversation: Story = {
  args: {
    activeConversationId: conversations[0].id,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const activeRow = (
      await canvas.findByText(conversations[0].title!)
    ).closest("li");
    const inactiveRow = canvas
      .getByText(conversations[1].title!)
      .closest("li");

    expect(activeRow).not.toBeNull();
    expect(inactiveRow).not.toBeNull();
    expect(activeRow!.className).not.toBe(inactiveRow!.className);
  },
};

// The conversation we target for the delete flows: "Volume of distribution"
// (id 2). Using a concrete row gives the deletion a verifiable target.
const targetConversation = conversations[1];

// Spy wired into the DELETE handler for the DeleteConversation story so we can
// assert the request actually fired against the right conversation id.
const deleteSpy = fn();

const deleteHandlers = [
  // Reuse the mock's GET handler so we don't duplicate the list data.
  conversationHandlers[0],
  http.delete("/api/conversations/:id/", async ({ params }) => {
    deleteSpy(params.id);
    return new HttpResponse(null, { status: 204 });
  }),
];


async function openDeleteDialog(canvas: ReturnType<typeof within>) {
  // Wait for the list to load.
  await canvas.findByText("Clearance estimation");

  const optionsButton = canvas.getByRole("button", {
    name: `Options for ${targetConversation.title}`,
  });
  await userEvent.click(optionsButton);

  // The menu is portalled onto document.body.
  const deleteItem = await screen.findByRole("menuitem", {
    name: "Delete conversation",
  });
  await userEvent.click(deleteItem);

  // The confirmation dialog is also portalled.
  return screen.findByRole("dialog");
}

export const DeleteConversation: Story = {
  parameters: {
    msw: {
      handlers: {
        conversations: deleteHandlers,
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    deleteSpy.mockClear();

    const dialog = await openDeleteDialog(canvas);
    expect(
      within(dialog).getByText(
        "This conversation will be permanently deleted. This cannot be undone.",
      ),
    ).toBeInTheDocument();

    const confirmButton = within(dialog).getByRole("button", {
      name: "Confirm",
    });
    await userEvent.click(confirmButton);

    await waitFor(() =>
      expect(deleteSpy).toHaveBeenCalledWith(String(targetConversation.id)),
    );

    // After confirming, the dialog closes
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  },
};

// Cancelling the delete dialog leaves the conversation in place
export const CancelDelete: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const dialog = await openDeleteDialog(canvas);
    const cancelButton = within(dialog).getByRole("button", { name: "Cancel" });
    await userEvent.click(cancelButton);

    // Dialog closes and the conversation is still listed.
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(canvas.getByText(targetConversation.title!)).toBeInTheDocument();
  },
};
