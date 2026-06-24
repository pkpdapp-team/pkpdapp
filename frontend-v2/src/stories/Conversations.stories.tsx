import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, within } from "storybook/test";

import ConversationList from "../features/chat/ConversationList";
import { conversationHandlers } from "./conversation.mock";

const onSelect = fn();
const onNew = fn();
const onBack = fn();

const meta: Meta<typeof ConversationList> = {
  title: "Chatbot/Conversations",
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
    const heading = canvas.getByText("Conversations");
    expect(heading).toBeInTheDocument();

    const conversation = await canvas.findByText("Clearance estimation");
    expect(conversation).toBeInTheDocument();
  },
};

export const NoConversations: Story = {
  args: {
    projectId: null,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const emptyMessage = await canvas.findByText("No conversations yet");
    expect(emptyMessage).toBeInTheDocument();
  },
};

export const NewConversation: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const newButton = await canvas.findByRole("button", {
      name: "New conversation",
    });
    await userEvent.click(newButton);
    expect(onNew).toHaveBeenCalled();
  },
};
