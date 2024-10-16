import { Box, Tooltip, Typography } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

type TableHeaderType = {
  label: string;
  tooltip?: string;
  variant?:
    | "body1"
    | "body2"
    | "button"
    | "caption"
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "h5"
    | "h6"
    | "inherit"
    | "overline"
    | "subtitle1"
    | "subtitle2"
    | string;
};

export const TableHeader = ({
  label,
  tooltip,
  variant = "h5",
}: TableHeaderType) =>
  tooltip?.length ? (
    <Box sx={{ display: "flex", width: "fit-content", alignItems: 'center', transform: 'scale(0.85)' }}>
      <Typography variant={variant}>{label}</Typography>
      <Tooltip title={tooltip} arrow placement='right' PopperProps={{ sx: { marginLeft: '4px'}}} >
        <HelpOutlineIcon sx={{ marginLeft: "8px", color: 'dimgray', }} />
      </Tooltip>
    </Box>
  ) : (
    <Typography variant={variant}>{label}</Typography>
  );
