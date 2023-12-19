import React, { useState } from "react";
import { HelpOutline } from "@mui/icons-material";
import { IconButton, Tooltip } from "@mui/material";
import { tooltipWrapper } from "../shared/tooltipWrapper";

interface HelpButtonProps {
  title: string;
  children: React.ReactNode;
}

const HelpButton: React.FC<HelpButtonProps> = ({ title, children }) => {
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Tooltip
        placement="bottom-end"
        title={tooltipWrapper(children, handleClose)}
        disableHoverListener={true}
        open={open}
        componentsProps={{
          tooltip: {
            sx: {
              bgcolor: "common.white",
              color: "common.black",
              boxShadow: "2px 2px 5px rgba(0, 0, 0, .3)"
            },
          },
        }}
      >
        <IconButton onClick={handleOpen}>
            <HelpOutline />
        </IconButton>
      </Tooltip>
    </>
  );
};

export default HelpButton;
