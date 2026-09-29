import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";

export const MIN_CHAT_WIDTH = 320;
export const DEFAULT_CHAT_WIDTH = 380;
export const MAX_CHAT_WIDTH = 700;

interface ChatState {
  isOpen: boolean;
  drawerWidth: number;
  activeConversationId: number | null;
  activeConversationProjectId: number | null;
}

interface ActiveConversation {
  conversationId: number;
  projectId: number;
}

const initialState: ChatState = {
  isOpen: false,
  drawerWidth: DEFAULT_CHAT_WIDTH,
  activeConversationId: null,
  activeConversationProjectId: null,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    toggleChat: (state) => {
      state.isOpen = !state.isOpen;
    },
    openChat: (state) => {
      state.isOpen = true;
    },
    closeChat: (state) => {
      state.isOpen = false;
    },
    setChatWidth: (state, action: PayloadAction<number>) => {
      state.drawerWidth = Math.min(
        MAX_CHAT_WIDTH,
        Math.max(MIN_CHAT_WIDTH, action.payload),
      );
    },
    setActiveConversation: (
      state,
      action: PayloadAction<ActiveConversation | null>,
    ) => {
      state.activeConversationId = action.payload?.conversationId ?? null;
      state.activeConversationProjectId = action.payload?.projectId ?? null;
    },
  },
});

export const {
  toggleChat,
  openChat,
  closeChat,
  setChatWidth,
  setActiveConversation,
} = chatSlice.actions;

export const selectChatOpen = (state: RootState) => state.chat.isOpen;
export const selectChatWidth = (state: RootState) => state.chat.drawerWidth;
export const selectActiveConversationId = (state: RootState) =>
  state.chat.activeConversationProjectId === state.main.selectedProject
    ? state.chat.activeConversationId
    : null;

export default chatSlice.reducer;
