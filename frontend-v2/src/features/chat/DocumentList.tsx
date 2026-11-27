import { FC, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Menu,
  MenuItem,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import { DocumentRead } from "../../app/backendApi";
import { formatRelativeDate } from "./ConversationList";
import { useDocuments } from "./useDocuments";

interface DocumentListProps {
  projectId: number | null;
  projectName?: string;
  onBack: () => void;
}

function errorMessage(err: unknown): string {
  const e = err as { status?: number; data?: unknown };
  if (e?.status === 503)
    return "Document search is not enabled on this server.";
  const data = e?.data;
  if (data && typeof data === "object") {
    const parts = Object.values(data as Record<string, unknown>).flatMap((v) =>
      Array.isArray(v) ? v.map(String) : [String(v)],
    );
    if (parts.length > 0) return parts.join(" ");
  }
  return "Failed to upload document.";
}

function statusText(doc: DocumentRead): string {
  if (doc.status === "processing") return "Processing…";
  if (doc.status === "failed")
    return `Failed${doc.error ? `: ${doc.error}` : ""}`;
  return doc.chunk_count != null
    ? `Ready · ${doc.chunk_count} chunks`
    : "Ready";
}

const DocumentList: FC<DocumentListProps> = ({
  projectId,
  projectName,
  onBack,
}) => {
  const { documents, upload, isUploading, destroy, retry, isLoading } =
    useDocuments(projectId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuDocumentId, setMenuDocumentId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<number | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(null);
    try {
      await upload(file).unwrap();
    } catch (err) {
      setUploadError(errorMessage(err));
    }
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    documentId: number,
  ) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setMenuDocumentId(documentId);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuDocumentId(null);
  };

  const handleDeleteClick = () => {
    setDocumentToDelete(menuDocumentId);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (documentToDelete === null) return;
    try {
      await destroy(documentToDelete).unwrap();
    } catch (err) {
      console.error("Failed to delete document:", err);
    }
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  return (
    <Stack direction="column" sx={{ height: "100%", overflow: "hidden" }}>
      <Stack sx={{ px: 2, py: 1.5 }}>
        <Stack
          direction="row"
          sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Typography sx={{ fontSize: "1.1rem", fontWeight: 600 }}>
            Documents
          </Typography>
          <IconButton
            size="small"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Add document"
            color="primary"
            disabled={projectId === null || isUploading}
          >
            <UploadFileOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            aria-label="Upload PDF document"
            hidden
            onChange={handleFileChange}
          />
        </Stack>
        {projectName && (
          <Typography
            sx={{ fontSize: "0.75rem", color: "text.secondary", mt: 0.25 }}
          >
            Project: {projectName}
          </Typography>
        )}
      </Stack>

      {uploadError && (
        <Alert
          severity="error"
          sx={{ mx: 1.5, mb: 0.5, fontSize: "0.8rem" }}
          onClose={() => setUploadError(null)}
        >
          {uploadError}
        </Alert>
      )}

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
        ) : documents.length === 0 ? (
          <Stack spacing={1} sx={{ alignItems: "center", mt: 6, px: 2 }}>
            <Typography sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
              No documents yet
            </Typography>
            <Typography
              sx={{
                fontSize: "0.8rem",
                color: "text.secondary",
                textAlign: "center",
              }}
            >
              Upload a PDF to let the assistant search it.
            </Typography>
          </Stack>
        ) : (
          <List disablePadding>
            {documents.map((doc) => (
              <ListItem
                key={doc.id}
                disablePadding
                secondaryAction={
                  <IconButton
                    className="document-menu-btn"
                    size="small"
                    onClick={(e) => handleMenuOpen(e, doc.id)}
                    aria-label={`Options for ${doc.filename}`}
                    sx={{
                      width: 32,
                      height: 32,
                      opacity: 0,
                      transition: "opacity 0.15s",
                      "&:focus-visible": { opacity: 1 },
                    }}
                  >
                    <MoreVertIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                }
                sx={{
                  borderLeft: "3px solid transparent",
                  minHeight: 44,
                  "&:hover": {
                    bgcolor: "grey.100",
                    "& .document-menu-btn": { opacity: 1 },
                  },
                  "&:focus-within": {
                    "& .document-menu-btn": { opacity: 1 },
                  },
                }}
              >
                <ListItemText
                  sx={{ px: 2, pr: 5, py: 0.5 }}
                  primary={doc.filename}
                  secondary={
                    <Box
                      component="span"
                      sx={{ display: "flex", flexDirection: "column" }}
                    >
                      <Box component="span" sx={{ fontSize: "0.8rem" }}>
                        {formatRelativeDate(doc.created_at)}
                      </Box>
                      <Box
                        component="span"
                        sx={{
                          fontSize: "0.8rem",
                          color:
                            doc.status === "failed"
                              ? "error.main"
                              : "text.secondary",
                        }}
                      >
                        {statusText(doc)}
                        {doc.status === "failed" && (
                          <Button
                            size="small"
                            onClick={() => retry(doc.id)}
                            sx={{
                              ml: 1,
                              py: 0,
                              minWidth: 0,
                              fontSize: "0.75rem",
                              textTransform: "none",
                            }}
                          >
                            Retry
                          </Button>
                        )}
                      </Box>
                    </Box>
                  }
                  slotProps={{
                    primary: {
                      sx: { fontSize: "0.875rem", fontWeight: 400 },
                      noWrap: true,
                    },
                    secondary: { component: "span" },
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleDeleteClick} sx={{ color: "error.main" }}>
          Delete document
        </MenuItem>
      </Menu>

      <ConfirmationDialog
        open={deleteDialogOpen}
        title="Delete document"
        message="This document will be permanently deleted and the assistant will no longer be able to search it. This cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

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

export default DocumentList;
