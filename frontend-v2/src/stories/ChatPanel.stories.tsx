import type { Meta, StoryObj, Decorator } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { useDispatch } from "react-redux";
import { http, HttpResponse } from "msw";

import ChatPanel from "../features/chat/ChatPanel";
import { openChat, setActiveConversation } from "../features/chat/chatSlice";
import {
  PageName,
  setPage,
  setProject,
  setSubPage,
  SubPageName,
} from "../features/main/mainSlice";
import {
  conversationHandlers,
  conversations,
  messageHandlers,
} from "./conversation.mock";

function useChatPanelState(
  projectId: number | null,
  conversationId: number | null,
  page: PageName = PageName.PROJECTS,
  subPage: SubPageName | null = null,
) {
  const dispatch = useDispatch();
  dispatch(setPage(page));
  dispatch(setSubPage(subPage));
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

const modelParametersState: Decorator = (Story) => {
  useChatPanelState(57, null, PageName.MODEL, SubPageName.PARAMETERS);
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

const createConversationRequest = fn();
const chatbotRequest = fn();

export const SendsCurrentPageContext: Story = {
  decorators: [modelParametersState],
  parameters: {
    msw: {
      handlers: {
        conversations: conversationHandlers,
        messages: messageHandlers,
        createConversation: http.post(
          "/api/conversations/",
          async ({ request }) => {
            const body = await request.json();
            createConversationRequest(body);
            return HttpResponse.json(
              {
                id: 3,
                project: 57,
                title: "",
                created_at: "2025-06-03T09:00:00Z",
                updated_at: "2025-06-03T09:00:00Z",
                last_message_preview: "",
              },
              { status: 201 },
            );
          },
        ),
        chatbot: http.post("/api/chatbot/", async ({ request }) => {
          chatbotRequest(await request.json());
          return new HttpResponse(
            [
              'data: {"type":"start","messageId":"context-test"}',
              'data: {"type":"start-step"}',
              'data: {"type":"finish-step"}',
              'data: {"type":"finish"}',
              "data: [DONE]",
              "",
            ].join("\n\n"),
            {
              headers: {
                "Content-Type": "text/event-stream",
                "x-vercel-ai-ui-message-stream": "v1",
              },
            },
          );
        }),
      },
    },
  },
  beforeEach: () => {
    createConversationRequest.mockClear();
    chatbotRequest.mockClear();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByRole("textbox"),
      "Explain these parameters",
    );

    const sendButton = canvas.getByRole("button", { name: /send message/i });
    await waitFor(() => expect(sendButton).toBeEnabled());

    expect(chatbotRequest).not.toHaveBeenCalled();
    await userEvent.click(sendButton);
    await waitFor(() => expect(chatbotRequest).toHaveBeenCalledTimes(1));
    expect(createConversationRequest).toHaveBeenCalledWith({
      project: 57,
      title: "",
    });
    expect(chatbotRequest).toHaveBeenCalledWith({
      conversation_id: 3,
      content: "Explain these parameters",
      context: {
        page: "Model",
        sub_page: "Parameters",
      },
    });
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
