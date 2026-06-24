import { FC, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import AddCommentOutlinedIcon from "@mui/icons-material/AddCommentOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import { useConversations } from "./useConversations";

interface ConversationListProps {
  projectId: number | null;
  projectName?: string;
  activeConversationId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
  onBack: () => void;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  if (diffDays === 0) return `Today ${time}`;
  if (diffDays === 1) return `Yesterday ${time}`;
  if (diffDays < 7) return `${diffDays} days ago, ${time}`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) + ` ${time}`;
}

const ConversationList: FC<ConversationListProps> = ({
  projectId,
  projectName,
  activeConversationId,
  onSelect,
  onNew,
  onBack,
}) => {
  const { conversations, destroy, isLoading } = useConversations(projectId);

  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuConversationId, setMenuConversationId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<number | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, conversationId: number) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setMenuConversationId(conversationId);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuConversationId(null);
  };

  const handleDeleteClick = () => {
    setConversationToDelete(menuConversationId);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (conversationToDelete === null) return;
    try {
      await destroy({ id: conversationToDelete }).unwrap();
      if (activeConversationId === conversationToDelete) {
        onSelect(0);
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  return (
    <Stack direction="column" sx={{ height: "100%", overflow: "hidden" }}>
      {/* Header row */}
      <Stack sx={{ px: 2, py: 1.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography sx={{ fontSize: "1.1rem", fontWeight: 600 }}>
            Conversations
          </Typography>
          <IconButton
            size="small"
            onClick={onNew}
            aria-label="New conversation"
            color="primary"
            disabled={projectId === null}
          >
            <AddCommentOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Stack>
        {projectName && (
          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mt: 0.25 }}>
            Project: {projectName}
          </Typography>
        )}
      </Stack>

      {/* List */}
      <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
        {isLoading ? (
          <Stack spacing={1} sx={{ px: 2, py: 1 }}>
            {[0, 1, 2].map((i) => (
              <Box key={i}>
                <Skeleton variant="text" width="70%" height={20} />
                <Skeleton variant="text" width="50%" height={16} />
              </Box>
            ))}
          </Stack>
        ) : conversations.length === 0 ? (
          <Stack
            alignItems="center"
            spacing={1}
            sx={{ mt: 6, px: 2 }}
          >
            <Typography sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
              No conversations yet
            </Typography>
            <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", textAlign: "center" }}>
              Start a new conversation to begin chatting.
            </Typography>
          </Stack>
        ) : (
          <List disablePadding>
            {conversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;
              return (
                <ListItem
                  key={conversation.id}
                  disablePadding
                  secondaryAction={
                    <IconButton
                      className="conversation-menu-btn"
                      size="small"
                      onClick={(e) => handleMenuOpen(e, conversation.id)}
                      aria-label="Conversation options"
                      sx={{
                        width: 32,
                        height: 32,
                        visibility: "hidden",
                      }}
                    >
                      <MoreVertIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  }
                  sx={{
                    borderLeft: isActive ? "3px solid" : "3px solid transparent",
                    borderLeftColor: isActive ? "primary.main" : "transparent",
                    bgcolor: isActive ? "grey.50" : "transparent",
                    minHeight: 44,
                    "&:hover": {
                      bgcolor: "grey.100",
                      "& .conversation-menu-btn": {
                        visibility: "visible",
                      },
                    },
                  }}
                >
                  <ListItemButton
                    onClick={() => onSelect(conversation.id)}
                    sx={{ minHeight: 44, pr: 5 }}
                  >
                    <ListItemText
                      primary={conversation.title || "Untitled conversation"}
                      secondary={
                        <Box component="span" sx={{ display: "flex", flexDirection: "column" }}>
                          <Box component="span" sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                            {formatRelativeDate(conversation.updated_at)}
                          </Box>
                          {conversation.last_message_preview && (
                            <Box
                              component="span"
                              sx={{
                                fontSize: "0.8rem",
                                color: "text.secondary",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                display: "block",
                                maxWidth: "100%",
                              }}
                            >
                              {conversation.last_message_preview}
                            </Box>
                          )}
                        </Box>
                      }
                      primaryTypographyProps={{
                        sx: { fontSize: "0.875rem", fontWeight: 400 },
                        noWrap: true,
                      }}
                      secondaryTypographyProps={{
                        component: "span",
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>

      {/* Three-dot menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleDeleteClick} sx={{ color: "error.main" }}>
          Delete conversation
        </MenuItem>
      </Menu>

      {/* Delete confirmation dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        title="Delete conversation"
        message="This conversation will be permanently deleted. This cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      {/* Footer */}
      <Box sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: "grey.200" }}>
        <Button
          variant="text"
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          size="small"
        >
          Back to chat
        </Button>
      </Box>
    </Stack>
  );
};

export default ConversationList;
