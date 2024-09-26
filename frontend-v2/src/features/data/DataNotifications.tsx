import { Alert, Box, Modal, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export const DataNotifications = ({
  isOpen,
  fileName,
  handleOpenChange,
  errors,
  warnings,
}: {
  isOpen: boolean;
  fileName: string;
  handleOpenChange: () => void;
  errors: string[];
  warnings: string[];
}) => {
  return (
    <Modal onClose={handleOpenChange} open={isOpen}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        }}
      >
        <Box
          sx={{
            width: "50wh",
            backgroundColor: "white",
            display: "flex",
            flexDirection: "column",
            padding: "1rem",
          }}
        >
          <IconButton
            sx={{
              width: "fit-content",
              alignSelf: "flex-end",
            }}
            onClick={handleOpenChange}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
          {fileName && <Alert severity="info">{fileName}</Alert>}
          {errors.map((error) => (
            <Alert key={error} severity="error">
              {error}
            </Alert>
          ))}
          {warnings.map((warning) => (
            <Alert key={warning} severity="warning">
              {warning}
            </Alert>
          ))}
        </Box>
      </Box>
    </Modal>
  );
};
