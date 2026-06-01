import { FC, MouseEvent, KeyboardEvent, ReactNode } from "react";
import { Box, SxProps, Theme } from "@mui/material";

interface IconNonButtonProps {
  children: ReactNode;
  onClick?: (e: MouseEvent<HTMLSpanElement>) => void;
  sx?: SxProps<Theme>;
  name?: string;
}

/**
 * A component that looks and behaves like an IconButton but renders as a span
 * instead of a button element. This is useful when you need an icon button
 * inside another button-like component (e.g., Tab) to avoid nested button elements
 * which cause hydration errors.
 */
const IconNonButton: FC<IconNonButtonProps> = ({
  children,
  onClick,
  sx = {},
  name,
}) => {
  const handleKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    if ((e.key === "Enter" || e.key === " ") && onClick) {
      e.preventDefault();
      onClick(e as unknown as MouseEvent<HTMLSpanElement>);
    }
  };

  return (
    <Box
      component="span"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={name}
      sx={{
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
        padding: "8px",
        borderRadius: "50%",
        "&:hover": { backgroundColor: "action.hover" },
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

export default IconNonButton;
