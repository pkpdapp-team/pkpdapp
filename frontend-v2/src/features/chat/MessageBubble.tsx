import { FC, memo } from "react";
import { Box, Stack, Typography, alpha, keyframes } from "@mui/material";
import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/a11y-light.css";
import type { Components } from "react-markdown";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import type { UIMessage } from "ai";
import type { KindEnum } from "../../app/backendApi";
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

const FitIcon: FC = () => (
  <Box
    sx={(theme) => ({
      width: 40,
      height: 40,
      borderRadius: 1.5,
      flexShrink: 0,
      display: "grid",
      placeItems: "center",
      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
    })}
  >
    <ShowChartIcon sx={{ color: "white" }} />
  </Box>
);

// a shared fit, shown as an event in the chat rather than a user bubble
const QuickFitCard: FC = () => (
  <Stack direction="row" sx={{ justifyContent: "center", mb: 2 }}>
    <Box
      sx={(theme) => ({
        width: "90%",
        p: 1.5,
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
        backgroundColor: alpha(theme.palette.primary.main, 0.05),
      })}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <FitIcon />
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Optimisation results
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Shared from the Simulations page
          </Typography>
        </Box>
      </Stack>
    </Box>
  </Stack>
);

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
  kind?: KindEnum;
  isUser: boolean;
  isStreaming?: boolean;
}> = ({ parts, kind, isUser, isStreaming }) => {
  if (isUser) {
    const text = parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
    if (kind === "quick_fit") {
      return <QuickFitCard />;
    }
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
