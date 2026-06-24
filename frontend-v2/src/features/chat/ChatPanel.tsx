import { FC, useState, useRef, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import {
  Alert,
  Box,
  Button,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import { useChat } from "@ai-sdk/react";
import { UIMessage } from "ai";
import { useAppDispatch } from "../../app/hooks";
import { RootState } from "../../app/store";
import { useProjectRetrieveQuery } from "../../app/backendApi";
import { api } from "../../app/api";
import {
  selectChatOpen,
  selectChatWidth,
  selectActiveConversationId,
  setActiveConversation,
  closeChat,
  setChatWidth,
  MIN_CHAT_WIDTH,
  MAX_CHAT_WIDTH,
} from "./chatSlice";
import { useConversations } from "./useConversations";
import ConversationList from "./ConversationList";
import transport from "./chatTransport";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import ChatInput from "./ChatInput";

interface ApiMessage {
  id: number;
  role: "user" | "assistant" | "tool_call" | "tool_result";
  content: string;
}

/**
 * Convert the flat DB message sequence into UIMessages for display.
 */
function buildUIMessages(apiMessages: ApiMessage[]): UIMessage[] {
  const result: UIMessage[] = [];

  for (const m of apiMessages) {
    if (m.role === "user") {
      result.push({
        id: String(m.id),
        role: "user",
        parts: [{ type: "text" as const, text: m.content }],
      });
    } else if (m.role === "assistant") {
      result.push({
        id: String(m.id),
        role: "assistant",
        parts: [{ type: "text" as const, text: m.content }],
      });
    }
  }

  return result;
}

const ChatPanel: FC = () => {
  const dispatch = useAppDispatch();
  const isOpen = useSelector(selectChatOpen);
  const drawerWidth = useSelector(selectChatWidth);
  const activeConversationId = useSelector(selectActiveConversationId);
  const selectedProject = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const [input, setInput] = useState("");
  const [showConversationList, setShowConversationList] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const drawerPaperRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const { data: project } = useProjectRetrieveQuery(
    { id: selectedProject! },
    { skip: !selectedProject },
  );

  const { create: createConversation } = useConversations(selectedProject);

  const { messages, sendMessage, setMessages, status, error, stop } = useChat({
    transport,
    experimental_throttle: 50,
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Invalidate conversation list cache after streaming completes
  // so last_message_preview updates immediately
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (
      prevStatusRef.current === "streaming" &&
      status === "ready" &&
      activeConversationId
    ) {
      dispatch(api.util.invalidateTags([{ type: "Conversation", id: "LIST" }]));
    }
    prevStatusRef.current = status;
  }, [status, activeConversationId, dispatch]);

  const handleNewConversation = async () => {
    if (!selectedProject) return;
    try {
      const result = await createConversation({
        conversation: { project: selectedProject, title: "" },
      }).unwrap();
      dispatch(setActiveConversation(result.id));
      setMessages([]);
      setShowConversationList(false);
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  };

  const handleSelectConversation = async (id: number) => {
    dispatch(setActiveConversation(id));
    setShowConversationList(false);
    try {
      const response = await fetch(`/api/messages/?conversation_id=${id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load messages");
      const apiMessages: ApiMessage[] = await response.json();
      setMessages(buildUIMessages(apiMessages));
    } catch (err) {
      console.error("Failed to load conversation messages:", err);
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading || !selectedProject) return;

    setInput("");

    let convId = activeConversationId;
    if (!convId) {
      try {
        const result = await createConversation({
          conversation: { project: selectedProject, title: "" },
        }).unwrap();
        convId = result.id;
        dispatch(setActiveConversation(convId));
      } catch (err) {
        console.error("Failed to create conversation:", err);
        return;
      }
    }

    sendMessage(
      { text: trimmed },
      { body: { conversationId: convId } },
    );
  };

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

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const scrollToBottom = () => {
      if (stickToBottomRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    };

    const observer = new MutationObserver(scrollToBottom);
    observer.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (status === "submitted") {
      stickToBottomRef.current = true;
      const el = scrollContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [status]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) {
        stickToBottomRef.current = false;
      }
    };

    let lastTouchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      lastTouchY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0].clientY > lastTouchY) {
        stickToBottomRef.current = false;
      }
      lastTouchY = e.touches[0].clientY;
    };

    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (atBottom) {
      stickToBottomRef.current = true;
    }
  }, []);

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
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ minWidth: 0, flex: 1, mr: 1 }}
          >
            <SmartToyOutlinedIcon sx={{ fontSize: 22, opacity: 0.9 }} />
            <Stack spacing={0} sx={{ minWidth: 0 }}>
              <Typography
                noWrap
                sx={{
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  letterSpacing: 0.3,
                }}
              >
                AI Assistant
              </Typography>
              {project?.name && (
                <Typography
                  noWrap
                  sx={{ fontSize: "0.7rem", opacity: 0.7, mt: -0.3 }}
                >
                  Project: {project.name}
                </Typography>
              )}
            </Stack>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ForumOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={() => setShowConversationList((v) => !v)}
              sx={{
                color: showConversationList
                  ? "white"
                  : "rgba(255,255,255,0.7)",
                borderColor: showConversationList
                  ? "rgba(255,255,255,0.5)"
                  : "rgba(255,255,255,0.3)",
                bgcolor: showConversationList
                  ? "rgba(255,255,255,0.15)"
                  : "transparent",
                textTransform: "none",
                fontSize: "0.75rem",
                px: 1,
                py: 0,
                justifyContent: "flex-start",
                "& .MuiButton-startIcon": { mr: 0.75 },
                "&:hover": {
                  color: "white",
                  borderColor: "rgba(255,255,255,0.6)",
                  bgcolor: showConversationList
                    ? "rgba(255,255,255,0.22)"
                    : "rgba(255,255,255,0.1)",
                },
              }}
            >
              Conversations
            </Button>
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

        {/* Main content: conversation list or messages */}
        {showConversationList ? (
          <ConversationList
            projectId={selectedProject}
            projectName={project?.name}
            activeConversationId={activeConversationId}
            onSelect={handleSelectConversation}
            onNew={handleNewConversation}
            onBack={() => setShowConversationList(false)}
          />
        ) : (
          <>
            {/* Messages */}
            <Box
              ref={scrollContainerRef}
              onScroll={handleScroll}
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
                  {!selectedProject ? (
                    <>
                      <FolderOutlinedIcon
                        sx={{ fontSize: 36, opacity: 0.4 }}
                      />
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ textAlign: "center", px: 2 }}
                      >
                        Select a project to start chatting
                      </Typography>
                    </>
                  ) : (
                    <>
                      <SmartToyOutlinedIcon
                        sx={{ fontSize: 36, opacity: 0.4 }}
                      />
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ textAlign: "center", px: 2 }}
                      >
                        Ask me about pharmacokinetic and pharmacodynamic
                        modelling.
                      </Typography>
                    </>
                  )}
                </Stack>
              )}
              {messages.map((msg, idx) => {
                const isUser = msg.role === "user";
                const isLastAssistant =
                  !isUser &&
                  status === "streaming" &&
                  idx === messages.length - 1;
                return (
                  <MessageBubble
                    key={msg.id}
                    parts={msg.parts ?? []}
                    isUser={isUser}
                    isStreaming={isLastAssistant}
                  />
                );
              })}
              {(status === "submitted" ||
                (status === "streaming" &&
                  !messages
                    .filter((m) => m.role === "assistant")
                    .at(-1)
                    ?.parts?.some(
                      (p) => p.type === "text" && p.text.length > 0,
                    ))) && (
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
                onClose={() => {}}
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
              disabled={!selectedProject}
            />
          </>
        )}
      </Box>
    </Drawer>
  );
};

export default ChatPanel;
