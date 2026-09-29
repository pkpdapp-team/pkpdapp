import { FC, useState } from "react";
import { Button, Menu, MenuItem } from "@mui/material";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

type Gem = { url: string; text: string };

// Per-deployment external "Gem" links. Configured via two JSON-list env vars
// that must parse to non-empty arrays of equal length; each url is paired with
// the display text at the same index. Any parse failure or mismatch disables
// the button (returns an empty list) rather than throwing.
const { VITE_APP_GEM_URLS, VITE_APP_GEM_TEXTS } = import.meta.env;

function parseGems(): Gem[] {
  if (!VITE_APP_GEM_URLS || !VITE_APP_GEM_TEXTS) {
    return [];
  }
  try {
    const urls = JSON.parse(VITE_APP_GEM_URLS);
    const texts = JSON.parse(VITE_APP_GEM_TEXTS);
    if (
      !Array.isArray(urls) ||
      !Array.isArray(texts) ||
      urls.length === 0 ||
      urls.length !== texts.length
    ) {
      console.warn(
        "VITE_APP_GEM_URLS and VITE_APP_GEM_TEXTS must be non-empty JSON " +
          "arrays of equal length; the Gems button will not be shown.",
      );
      return [];
    }
    return urls.map((url: string, i: number) => ({ url, text: texts[i] }));
  } catch (e) {
    console.warn(
      "Failed to parse VITE_APP_GEM_URLS / VITE_APP_GEM_TEXTS as JSON; the " +
        "Gems button will not be shown.",
      e,
    );
    return [];
  }
}

const gems = parseGems();

const GemsButton: FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isOpen = Boolean(anchorEl);

  if (gems.length === 0) {
    return null;
  }

  const handleClose = () => setAnchorEl(null);

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<AutoAwesomeOutlinedIcon sx={{ fontSize: 16 }} />}
        endIcon={<ArrowDropDownIcon />}
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={(theme) => {
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
            boxShadow: isOpen
              ? `0 2px 6px ${theme.palette.primary.main}40`
              : "none",
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
              background: isOpen
                ? openButtonBackground
                : closedButtonBackground,
              boxShadow: `0 3px 14px ${theme.palette.primary.main}73`,
              transform: "translateY(-1px)",
              "&::after": {
                opacity: 1,
              },
            },
          };
        }}
      >
        Gems
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={isOpen}
        onClose={handleClose}
        sx={{ zIndex: 9999 }}
      >
        {gems.map((gem) => (
          <MenuItem
            key={gem.url}
            component="a"
            href={gem.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClose}
          >
            {gem.text}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default GemsButton;
