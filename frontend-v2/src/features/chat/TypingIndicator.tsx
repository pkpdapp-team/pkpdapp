import { FC } from "react";
import { Box, Stack } from "@mui/material";

const TypingIndicator: FC = () => (
  <Stack direction="row" spacing={0.5} sx={{ py: 0.5, px: 0.5 }}>
    {[0, 1, 2].map((i) => (
      <Box
        key={i}
        sx={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: "text.disabled",
          animation: "typing-dot 1.4s infinite ease-in-out",
          animationDelay: `${i * 0.2}s`,
          "@keyframes typing-dot": {
            "0%, 80%, 100%": { opacity: 0.3, transform: "scale(0.8)" },
            "40%": { opacity: 1, transform: "scale(1)" },
          },
        }}
      />
    ))}
  </Stack>
);

export default TypingIndicator;
