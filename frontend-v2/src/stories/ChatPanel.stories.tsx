import type { Meta, StoryObj, Decorator } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { useDispatch } from "react-redux";

import ChatPanel from "../features/chat/ChatPanel";
import { openChat, setActiveConversation } from "../features/chat/chatSlice";
import { setProject } from "../features/main/mainSlice";
import {
  conversationHandlers,
  conversations,
  messageHandlers,
} from "./conversation.mock";

function useChatPanelState(
  projectId: number | null,
  conversationId: number | null,
) {
  const dispatch = useDispatch();
  dispatch(setProject(projectId));
  dispatch(
    conversationId !== null && projectId !== null
      ? setActiveConversation({ conversationId, projectId })
      : setActiveConversation(null),
  );
  dispatch(openChat());
}

const noProjectState: Decorator = (Story) => {
  useChatPanelState(null, null);
  return <Story />;
};

const activeConversationState: Decorator = (Story) => {
  useChatPanelState(57, 1);
  return <Story />;
};

const projectOnlyState: Decorator = (Story) => {
  useChatPanelState(57, null);
  return <Story />;
};

const meta = {
  title: "Chatbot/ChatPanel",
  component: ChatPanel,
} satisfies Meta<typeof ChatPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

// No project selected: the panel prompts the user to pick one and the input is
// disabled, but the header and its controls are still present.
export const NoProject: Story = {
  decorators: [noProjectState],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    expect(canvas.getByText("AI Assistant")).toBeInTheDocument();
    // The prompt appears both in the empty message area and the disabled input.
    expect(
      canvas.getAllByText("Select a project to start chatting").length,
    ).toBeGreaterThan(0);

    expect(
      canvas.getByRole("button", { name: "Conversations" }),
    ).toBeEnabled();
    expect(
      canvas.getByRole("button", { name: /close chat/i }),
    ).toBeInTheDocument();
  },
};

// With a project and an active conversation, the stored messages are rendered.
export const WithMessages: Story = {
  decorators: [activeConversationState],
  parameters: {
    msw: { handlers: { messages: messageHandlers } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    expect(
      await canvas.findByText("How is clearance estimated?"),
    ).toBeInTheDocument();
    expect(
      canvas.getByText(/Clearance is estimated from the dose/i),
    ).toBeInTheDocument();
  },
};

// A project is selected but no conversation is active: the message view shows
// the empty-with-project prompt (the ELSE branch of the empty state) rather than
// the "select a project" prompt, and the input is enabled.
export const ProjectSelectedEmpty: Story = {
  decorators: [projectOnlyState],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    expect(canvas.getByText("AI Assistant")).toBeInTheDocument();
    expect(
      canvas.getByText(/Ask me about pharmacokinetic/i),
    ).toBeInTheDocument();
    expect(
      canvas.getByRole("button", { name: /send message/i }),
    ).toBeInTheDocument();
  },
};

// Typing a message and clicking send runs handleSend: the input is cleared and a
// conversation is created via the mocked API. The real streaming transport is not
// mocked, but handleSend still executes deterministically up to the send call.
export const SendMessage: Story = {
  decorators: [projectOnlyState],
  parameters: {
    msw: {
      handlers: {
        conversations: conversationHandlers,
        messages: messageHandlers,
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const textbox = canvas.getByRole("textbox");
    await userEvent.type(textbox, "Hello");
    expect(textbox).toHaveValue("Hello");

    await userEvent.click(
      canvas.getByRole("button", { name: /send message/i }),
    );

    // handleSend clears the input synchronously before awaiting.
    await expect(canvas.getByRole("textbox")).toHaveValue("");
  },
};

// Clicking the "Conversations" button toggles the conversation list into view,
// and the "Back to chat" control returns to the message view.
export const ToggleConversations: Story = {
  decorators: [projectOnlyState],
  parameters: {
    msw: { handlers: { conversations: conversationHandlers } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByRole("button", { name: "Conversations" }),
    );

    // The list now shows the mocked conversations.
    expect(
      await canvas.findByText(conversations[0].title!),
    ).toBeInTheDocument();

    await userEvent.click(
      canvas.getByRole("button", { name: /back to chat/i }),
    );

    // Back on the message view, the input placeholder is visible again.
    expect(
      canvas.queryByText(conversations[0].title!),
    ).not.toBeInTheDocument();
  },
};
