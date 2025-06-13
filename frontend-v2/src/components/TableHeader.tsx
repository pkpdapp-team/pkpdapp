import { Box, Tooltip, Typography, TypographyTypeMap } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

type TableHeaderType = {
  label: string;
  tooltip?: string;
  variant?: TypographyTypeMap["props"]["variant"];
  id?: string;
};

export const TableHeader = ({
  id,
  label,
  tooltip,
  variant = "h5",
}: TableHeaderType) =>
  tooltip?.length ? (
    <Box
      sx={{
        display: "flex",
        width: "fit-content",
        alignItems: "center",
        transform: "scale(0.85)",
      }}
    >
      <Typography id={id} variant={variant}>
        {label}
      </Typography>
      <Tooltip
        title={tooltip}
        arrow
        placement="right"
        PopperProps={{ sx: { marginLeft: "4px" } }}
      >
        <HelpOutlineIcon sx={{ marginLeft: "8px", color: "dimgray" }} />
      </Tooltip>
    </Box>
  ) : (
    <Typography id={id} variant={variant}>
      {label}
    </Typography>
  );
