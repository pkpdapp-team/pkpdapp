import { FC, KeyboardEvent } from "react";
import {
  Box,
  IconButton,
  InputAdornment,
  OutlinedInput,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isLoading: boolean;
}

const ChatInput: FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  onStop,
  isLoading,
}) => {
  const handleKeyDown = (
    e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <Box
      sx={{
        p: 1.5,
        borderTop: "1px solid",
        borderColor: "grey.200",
      }}
    >
      <OutlinedInput
        fullWidth
        size="small"
        placeholder="Ask something..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        multiline
        minRows={3}
        maxRows={3}
        sx={{
          borderRadius: 3,
          fontSize: "0.875rem",
          bgcolor: "grey.50",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "grey.300",
          },
        }}
        endAdornment={
          <InputAdornment position="end">
            {isLoading ? (
              <IconButton
                onClick={onStop}
                aria-label="stop generating"
                size="small"
                sx={{
                  bgcolor: "error.main",
                  color: "error.contrastText",
                  "&:hover": { bgcolor: "error.dark" },
                  width: 30,
                  height: 30,
                  transition: "all 0.15s ease",
                }}
              >
                <StopCircleOutlinedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            ) : (
              <IconButton
                onClick={onSend}
                disabled={!value.trim()}
                aria-label="send message"
                size="small"
                sx={{
                  bgcolor: value.trim()
                    ? "primary.main"
                    : "transparent",
                  color: value.trim()
                    ? "primary.contrastText"
                    : "text.disabled",
                  "&:hover": {
                    bgcolor: value.trim()
                      ? "primary.dark"
                      : "transparent",
                  },
                  width: 30,
                  height: 30,
                  transition: "all 0.15s ease",
                }}
              >
                <SendIcon sx={{ fontSize: 16 }} />
              </IconButton>
            )}
          </InputAdornment>
        }
      />
    </Box>
  );
};

export default ChatInput;
