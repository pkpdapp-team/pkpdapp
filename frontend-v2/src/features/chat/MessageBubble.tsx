import { FC, memo } from "react";
import { Box, Stack, Typography, keyframes } from "@mui/material";
import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/a11y-light.css";
import type { Components } from "react-markdown";
import type { UIMessage } from "ai";
type MessagePart = UIMessage["parts"][number];

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const cursorBlink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
`;

const shimmerSx = {
  display: "inline-block",
  my: 1,
  px: 1.5,
  py: 0.5,
  borderRadius: 1.5,
  fontSize: "0.8rem",
  fontStyle: "italic",
  color: "transparent",
  background: (theme: any) =>
    `linear-gradient(90deg, ${theme.palette.text.secondary} 25%, ${theme.palette.grey[500]} 50%, ${theme.palette.text.secondary} 75%)`,
  backgroundSize: "200% 100%",
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  animation: `${shimmer} 1.5s ease-in-out infinite`,
} as const;

const ToolStatus: FC<{
  toolName: string;
  input: Record<string, unknown> | undefined;
  isDone: boolean;
}> = ({ toolName, input, isDone }) => {
  const modelName =
    (input as { model_name?: string } | undefined)?.model_name ?? "model";
  const activeText = `Looking up ${modelName}...`;
  const doneText = `Looked up ${modelName}`;
  const animate = !isDone;

  return (
    <Typography
      variant="body2"
      sx={animate ? shimmerSx : { ...shimmerSx, color: "grey.400", background: "none", animation: "none" }}
    >
      {animate ? activeText : doneText}
    </Typography>
  );
};

/* ---- Markdown component overrides ---- */
const mdComponents: Partial<Components> = {
  blockquote: ({ children }) => (
    <Box component="blockquote" sx={{ borderLeft: "3px solid", borderColor: "grey.400", my: 1, ml: 0, pl: 1.5, color: "text.secondary", fontStyle: "italic" }}>{children}</Box>
  ),
  pre: ({ children }) => (
    <Box component="pre" sx={{ bgcolor: "grey.100", borderRadius: 1, p: 1.5, overflowX: "auto", fontSize: "0.8rem", my: 1 }}>{children}</Box>
  ),
  code: ({ children, className }: any) =>
    className ? (
      <code className={className}>{children}</code>
    ) : (
      <Box component="code" sx={{ fontSize: "0.8rem", fontFamily: "monospace", bgcolor: "grey.100", px: 0.5, borderRadius: 0.5 }}>{children}</Box>
    ),
};

const markdownSx = { fontSize: "0.875rem" };

const TextPart: FC<{
  text: string;
  showCursor: boolean;
}> = ({ text, showCursor }) => (
  <Box
    sx={showCursor ? {
      "& > *:last-child::after": {
        content: '"▋"',
        ml: "1px",
        animation: `${cursorBlink} 0.7s step-end infinite`,
        color: "text.secondary",
      },
    } : undefined}
  >
    <Markdown components={mdComponents} rehypePlugins={[rehypeHighlight]}>
      {text}
    </Markdown>
  </Box>
);

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
  const hasToolCalls = parts.some((p) => p.type === "dynamic-tool");
  const allToolsDone =
    hasToolCalls &&
    parts
      .filter((p): p is Extract<MessagePart, { type: "dynamic-tool" }> => p.type === "dynamic-tool")
      .every((p) => p.state === "output-available" || p.state === "output-error");
  const hasTextContent = parts.some(
    (p): p is Extract<MessagePart, { type: "text" }> => p.type === "text" && p.text.length > 0,
  );
  const showInterpreting = isStreaming && allToolsDone && !hasTextContent;

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
          if (part.type === "dynamic-tool") {
            const isDone =
              part.state === "output-available" ||
              part.state === "output-error";
            return (
              <ToolStatus
                key={part.toolCallId}
                toolName={part.toolName}
                input={part.input as Record<string, unknown> | undefined}
                isDone={isDone}
              />
            );
          }
          return null;
        })}
        {showInterpreting && (
          <Typography variant="body2" sx={shimmerSx}>
            Interpreting…
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default memo(MessageBubble);
