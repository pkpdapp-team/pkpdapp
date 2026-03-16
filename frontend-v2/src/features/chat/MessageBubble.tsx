import { FC, memo } from "react";
import { Box, Stack, Typography } from "@mui/material";
import type { UIMessage } from "ai";

type MessagePart = UIMessage["parts"][number];

const MessageBubble: FC<{
  parts: MessagePart[];
  isUser: boolean;
  isStreaming?: boolean;
}> = ({ parts, isUser }) => {
  const text = parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");

  if (isUser) {
    return (
      <Stack direction="row-reverse" sx={{ mb: 2 }}>
        <Box
          sx={{
            maxWidth: "80%",
            px: 1.75,
            py: 1,
            borderRadius: 2.5,
            backgroundColor: "primary.main",
            color: "primary.contrastText",
            lineHeight: 1.6,
          }}
        >
          <Typography
            variant="body2"
            sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}
          >
            {text}
          </Typography>
        </Box>
      </Stack>
    );
  }

  return (
    <Box sx={{ mb: 2, lineHeight: 1.6 }}>
      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", fontSize: "0.875rem" }}>
        {text}
      </Typography>
    </Box>
  );
};

export default memo(MessageBubble);
