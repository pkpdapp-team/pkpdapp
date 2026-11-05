import { Theme } from "@mui/material";

// outlined primary look with a gradient on hover, shared by the AI buttons
export const aiButtonSx =
  (isOpen = false) =>
  (theme: Theme) => {
    const hoverGradient = `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 60%, ${theme.palette.primary.dark} 100%)`;
    const openButtonBackground = `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.main} 60%, ${theme.palette.primary.main} 100%)`;
    const closedButtonBackground = `${theme.palette.primary.main}0A`;
    return {
      textTransform: "none",
      borderRadius: 1,
      fontWeight: 500,
      fontSize: "0.9rem",
      px: 2.5,
      py: 0.5,
      mr: 2,
      position: "relative",
      overflow: "hidden",
      zIndex: 0,
      borderColor: isOpen ? "transparent" : "primary.light",
      color: isOpen ? "white" : "primary.main",
      background: isOpen ? openButtonBackground : closedButtonBackground,
      boxShadow: isOpen ? `0 2px 6px ${theme.palette.primary.main}40` : "none",
      transition:
        "box-shadow 0.4s ease, transform 0.4s ease, color 0.4s ease, border-color 0.4s ease",
      "&::after": {
        content: '""',
        position: "absolute",
        inset: 0,
        background: hoverGradient,
        opacity: 0,
        transition: "opacity 0.4s ease",
        zIndex: -1,
      },
      "&:hover": {
        borderColor: "primary.light",
        color: "white",
        background: isOpen ? openButtonBackground : closedButtonBackground,
        boxShadow: `0 3px 14px ${theme.palette.primary.main}73`,
        transform: "translateY(-1px)",
        "&::after": {
          opacity: 1,
        },
      },
    };
  };
