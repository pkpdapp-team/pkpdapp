import { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import chatReducer, {
  setChatWidth,
  MIN_CHAT_WIDTH,
  MAX_CHAT_WIDTH,
  DEFAULT_CHAT_WIDTH,
} from "../features/chat/chatSlice";

// These tests have no UI; they exercise the chat slice reducer (a pure
// function) directly, asserting that setChatWidth clamps the drawer width to
// the allowed [MIN_CHAT_WIDTH, MAX_CHAT_WIDTH] range.
const ChatSliceTests = () => <div>Chat slice tests</div>;

const meta: Meta<typeof ChatSliceTests> = {
  title: "Chatbot/Chat Slice",
  component: ChatSliceTests,
};

export default meta;
type Story = StoryObj<typeof meta>;

const initialState = {
  isOpen: false,
  drawerWidth: DEFAULT_CHAT_WIDTH,
  activeConversationId: null,
};

export const ClampsDrawerWidth: Story = {
  play: async () => {
    // Above the maximum is clamped down to MAX_CHAT_WIDTH.
    expect(
      chatReducer(initialState, setChatWidth(MAX_CHAT_WIDTH + 1000)).drawerWidth,
    ).toBe(MAX_CHAT_WIDTH);

    // Below the minimum is clamped up to MIN_CHAT_WIDTH.
    expect(
      chatReducer(initialState, setChatWidth(MIN_CHAT_WIDTH - 1000)).drawerWidth,
    ).toBe(MIN_CHAT_WIDTH);

    // A value within range passes through unchanged.
    const inRange = (MIN_CHAT_WIDTH + MAX_CHAT_WIDTH) / 2;
    expect(
      chatReducer(initialState, setChatWidth(inRange)).drawerWidth,
    ).toBe(inRange);
  },
};
