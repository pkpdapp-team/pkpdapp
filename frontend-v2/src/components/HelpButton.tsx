import { FC, ReactNode, useState, useEffect, useRef, useCallback } from "react";
import HelpOutline from "@mui/icons-material/HelpOutline";
import { IconButton, Tooltip } from "@mui/material";
import { tooltipWrapper } from "../shared/tooltipWrapper";
import { useSelector } from "react-redux";
import { RootState } from "../app/store";

interface HelpButtonProps {
  title: string;
  children: ReactNode;
  maxWidth?: string;
  placement?:
    | "auto-end"
    | "auto-start"
    | "auto"
    | "bottom-end"
    | "bottom-start"
    | "bottom"
    | "left-end"
    | "left-start"
    | "left"
    | "right-end"
    | "right-start"
    | "right"
    | "top-end"
    | "top-start"
    | "top";
}

const HelpButton: FC<HelpButtonProps> = ({
  children,
  placement = "bottom-end",
  maxWidth,
}) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popperRef = useRef<HTMLDivElement>(null);
  const selectedPage = useSelector(
    (state: RootState) => state.main.selectedPage,
  );
  const selectedSubPage = useSelector(
    (state: RootState) => state.main.selectedSubPage,
  );

  useEffect(() => {
    setOpen(false);
  }, [selectedPage, selectedSubPage]);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        popperRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <Tooltip
      placement={placement}
      title={tooltipWrapper(children, handleClose)}
      disableHoverListener={true}
      open={open}
      slotProps={{
        popper: {
          ref: popperRef,
          sx: { zIndex: 99999 },
        },
        tooltip: {
          sx: {
            maxWidth: maxWidth,
            bgcolor: "common.white",
            color: "common.black",
            boxShadow: "2px 2px 5px rgba(0, 0, 0, .3)",
          },
        },
        transition: { timeout: { enter: 200, exit: 0 } },
      }}
    >
      <IconButton ref={buttonRef} onClick={handleOpen}>
        <HelpOutline titleAccess="Help" />
      </IconButton>
    </Tooltip>
  );
};

export default HelpButton;
