import { ReactNode } from "react";
import CloseIcon from "@mui/icons-material/Close";

export const tooltipWrapper = (children: ReactNode, onClose: () => void) => (
  <div style={{ display: "flex" }}>
    <div style={{ display: "block" }}>{children}</div>
    <CloseIcon sx={{ cursor: "pointer" }} onClick={onClose} />
  </div>
);
