import { Button, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";

export const DataNotificationsButton = ({
  onOpenNotifications,
  warnings,
  errors,
}: {
  onOpenNotifications: () => void;
  warnings: string[];
  errors: string[];
}) => (
  <Button
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      width: "fit-content",
      alignSelf: "center",
      zIndex: "2",
    }}
    onClick={onOpenNotifications}
  >
    <InfoOutlinedIcon color="primary" fontSize="small" />{" "}
    <Typography
      sx={{
        color: "#1976d2",
        marginLeft: ".2rem",
        marginRight: ".5rem"
      }}>
      1
    </Typography>
    <WarningAmberOutlinedIcon color="warning" fontSize="small" />{" "}
    <Typography
      sx={{
        color: "#ed6c02",
        marginLeft: ".2rem",
        marginRight: ".5rem"
      }}>
      {warnings?.length}
    </Typography>
    <ErrorOutlineOutlinedIcon color="error" fontSize="small" />
    <Typography
      sx={{
        color: "#d32f2f",
        marginLeft: ".2rem"
      }}>
      {errors?.length}
    </Typography>
  </Button>
);
