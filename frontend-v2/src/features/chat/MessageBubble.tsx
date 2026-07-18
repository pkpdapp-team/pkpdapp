import { FC, memo } from "react";
import { Box, Stack, Typography, keyframes } from "@mui/material";
import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/a11y-light.css";
import type { Components } from "react-markdown";
import type { UIMessage } from "ai";
type MessagePart = UIMessage["parts"][number];

const cursorBlink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
`;

/* ---- Markdown component overrides ---- */
const mdComponents: Partial<Components> = {
  blockquote: ({ children }) => (
    <Box
      component="blockquote"
      sx={{
        borderLeft: "3px solid",
        borderColor: "grey.400",
        my: 1,
        ml: 0,
        pl: 1.5,
        color: "text.secondary",
        fontStyle: "italic",
      }}
    >
      {children}
    </Box>
  ),
  pre: ({ children }) => (
    <Box
      component="pre"
      sx={{
        bgcolor: "grey.100",
        borderRadius: 1,
        p: 1.5,
        overflowX: "auto",
        fontSize: "0.8rem",
        my: 1,
      }}
    >
      {children}
    </Box>
  ),
  code: ({ children, className }) =>
    className ? (
      <code className={className}>{children}</code>
    ) : (
      <Box
        component="code"
        sx={{
          fontSize: "0.8rem",
          fontFamily: "monospace",
          bgcolor: "grey.100",
          px: 0.5,
          borderRadius: 0.5,
        }}
      >
        {children}
      </Box>
    ),
};

const markdownSx = { fontSize: "0.875rem" };

const rehypePlugins = [rehypeHighlight];

const TextPart: FC<{
  text: string;
  showCursor: boolean;
}> = ({ text, showCursor }) => {
  return (
    <Box
      sx={
        showCursor
          ? {
              "& > *:last-child::after": {
                content: '"▋"',
                ml: "1px",
                animation: `${cursorBlink} 0.7s step-end infinite`,
                color: "text.secondary",
              },
            }
          : undefined
      }
    >
      <Markdown components={mdComponents} rehypePlugins={rehypePlugins}>
        {text}
      </Markdown>
    </Box>
  );
};

const MessageBubble: FC<{
  parts: MessagePart[];
  isUser: boolean;
  isStreaming?: boolean;
}> = ({ parts, isUser, isStreaming }) => {
  if (isUser) {
    const text = parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
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

  // if assistant message...
  // Find the index of the last text part so we can attach the cursor to it
  let lastTextIndex = -1;
  if (isStreaming) {
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i].type === "text") {
        lastTextIndex = i;
        break;
      }
    }
  }

  return (
    <Box sx={{ mb: 2, lineHeight: 1.6 }}>
      <Box sx={markdownSx}>
        {parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <TextPart
                key={i}
                text={part.text}
                showCursor={i === lastTextIndex}
              />
            );
          }
          return null;
        })}
      </Box>
    </Box>
  );
};

export default memo(MessageBubble);
