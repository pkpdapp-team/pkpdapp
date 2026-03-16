import { FC, useState, useRef, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import {
  Alert,
  Box,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import { useChat } from "@ai-sdk/react";
import { UIMessage } from "ai";
import { useAppDispatch } from "../../app/hooks";
import {
  selectChatOpen,
  selectChatWidth,
  closeChat,
  setChatWidth,
  MIN_CHAT_WIDTH,
  MAX_CHAT_WIDTH,
} from "./chatSlice";
import transport from "./chatTransport";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import ChatInput from "./ChatInput";

const STORAGE_KEY = "pkpdapp-chat-messages";

function loadStoredMessages(): UIMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const ChatPanel: FC = () => {
  const dispatch = useAppDispatch();
  const isOpen = useSelector(selectChatOpen);
  const drawerWidth = useSelector(selectChatWidth);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const drawerPaperRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, setMessages, status, error, stop } = useChat({
    transport,
    messages: loadStoredMessages(),
    experimental_throttle: 50,
  });

  // Persist messages to sessionStorage
  useEffect(() => {
    if (messages.length === 0) {
      sessionStorage.removeItem(STORAGE_KEY);
    } else if (status === "ready") {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages, status]);

  const isLoading = status === "submitted" || status === "streaming";

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = drawerWidth;

      const onMouseMove = (ev: MouseEvent) => {
        const newWidth = Math.min(
          MAX_CHAT_WIDTH,
          Math.max(MIN_CHAT_WIDTH, startWidth + (startX - ev.clientX)),
        );
        if (drawerPaperRef.current) {
          drawerPaperRef.current.style.width = `${newWidth}px`;
        }
      };

      const onMouseUp = (ev: MouseEvent) => {
        const finalWidth = Math.min(
          MAX_CHAT_WIDTH,
          Math.max(MIN_CHAT_WIDTH, startWidth + (startX - ev.clientX)),
        );
        dispatch(setChatWidth(finalWidth));
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [drawerWidth, dispatch],
  );

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    sendMessage({ text: trimmed });
  };

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={() => dispatch(closeChat())}
      variant="persistent"
      PaperProps={{ ref: drawerPaperRef }}
      sx={{
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          top: "64px",
          height: "calc(100% - 64px)",
          overflow: "visible",
        },
      }}
    >
      {/* Drag handle */}
      <Box
        onMouseDown={handleDragStart}
        sx={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          cursor: "col-resize",
          zIndex: 1,
          "&:hover, &:active": {
            backgroundColor: "primary.main",
            opacity: 0.5,
          },
          transition: "background-color 0.15s ease",
        }}
      />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          background: (theme) =>
            `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[50]} 60%, ${theme.palette.grey[100]} 100%)`,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            pt: 2,
            pb: 1.3,
            background: (theme) =>
              `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 50%, ${theme.palette.primary.dark} 100%)`,
            color: "white",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <SmartToyOutlinedIcon sx={{ fontSize: 22, opacity: 0.9 }} />
            <Typography
              sx={{ fontSize: "1.1rem", fontWeight: 600, letterSpacing: 0.3 }}
            >
              AI Assistant
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.25}>
            <IconButton
              size="small"
              onClick={() => setMessages([])}
              aria-label="clear chat"
              sx={{
                color: "rgba(255,255,255,0.7)",
                "&:hover": {
                  color: "white",
                  bgcolor: "rgba(255,255,255,0.1)",
                },
              }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => dispatch(closeChat())}
              aria-label="close chat"
              sx={{
                color: "rgba(255,255,255,0.7)",
                "&:hover": {
                  color: "white",
                  bgcolor: "rgba(255,255,255,0.1)",
                },
              }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Stack>
        </Box>

        {/* Messages */}
        <Box
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            px: 2,
            py: 2,
          }}
        >
          {messages.length === 0 && (
            <Stack
              alignItems="center"
              spacing={1.5}
              sx={{ mt: 6, color: "text.secondary" }}
            >
              <SmartToyOutlinedIcon sx={{ fontSize: 36, opacity: 0.4 }} />
              <Typography
                variant="body2"
                color="text.secondary"
                component="div"
                sx={{ textAlign: "left", px: 2 }}
              >
                Ask me about your model, parameters, equations, or library
                models.
                <Box sx={{ mt: 1, fontWeight: 500 }}>I have access to:</Box>
                <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2 }}>
                  <li>Your current project and model configuration</li>
                  <li>Your parameter values and dosing setup</li>
                  <li>The full .mmt code for any library model</li>
                </Box>
              </Typography>
            </Stack>
          )}
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <MessageBubble
                key={msg.id}
                parts={msg.parts ?? []}
                isUser={isUser}
              />
            );
          })}
          {status === "submitted" && (
            <Box sx={{ mb: 2 }}>
              <TypingIndicator />
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>

        {error && (
          <Alert
            severity="error"
            sx={{ mx: 1.5, mb: 0.5, fontSize: "0.8rem" }}
            onClose={() => { }}
          >
            Failed to get a response. Please try again.
          </Alert>
        )}

        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          onStop={() => stop()}
          isLoading={isLoading}
        />
      </Box>
    </Drawer>
  );
};

export default ChatPanel;
