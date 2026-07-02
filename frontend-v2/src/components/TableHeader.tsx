import { Box, Typography, TypographyTypeMap } from "@mui/material";
import { ReactNode } from "react";
import HelpButton from "./HelpButton";

type TableHeaderType = {
  label: string;
  tooltip?: ReactNode;
  tooltipMaxWidth?: string;
  variant?: TypographyTypeMap["props"]["variant"];
  id?: string;
};

export const TableHeader = ({
  id,
  label,
  tooltip,
  tooltipMaxWidth,
  variant = "h5",
}: TableHeaderType) =>
  tooltip ? (
    <Box
      sx={{
        display: "flex",
        width: "fit-content",
        alignItems: "center",
      }}
    >
      <Typography id={id} variant={variant}>
        {label}
      </Typography>
      <HelpButton title={label} maxWidth={tooltipMaxWidth}>
        {tooltip}
      </HelpButton>
    </Box>
  ) : (
    <Typography id={id} variant={variant}>
      {label}
    </Typography>
  );
