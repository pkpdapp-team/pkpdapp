import { Box, Button, Typography, Collapse, Alert } from "@mui/material";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import SetUnits from "./SetUnits";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import { StepperState } from "./LoadDataStepper";

export const Notifications = ({
  isOpen,
  showData,
  errors,
  warnings,
  fileName,
  state,
  firstTime,
  showTimeUnitSelector,
  handleOpen,
  setHasTimeUnitChanged,
}: {
  isOpen: boolean;
  showData: boolean;
  errors: string[];
  warnings: string[];
  fileName: string;
  state: StepperState;
  firstTime: boolean;
  showTimeUnitSelector: boolean;
  handleOpen: () => void;
  setHasTimeUnitChanged: (state: boolean) => void;
}) => {
  return (
    <Box>
      <Button
        sx={{
          marginTop: ".5rem",
          backgroundColor: "whitesmoke",
          color: "black",
          width: "100%",
          justifyContent: "flex-start",
          textTransform: "capitalize",
          border: "1px solid rgba(0, 0, 0, 0.2)",
          borderBottom: isOpen ? "none" : "1px solid rgba(0, 0, 0, 0.2)",
          transition: "all .35s linear",
        }}
        disableRipple
        disableFocusRipple
        disableElevation
        onClick={handleOpen}
        startIcon={isOpen ? <ExpandLess /> : <ExpandMore />}
      >
        Notifications
        <Box
          sx={{
            marginLeft: "1rem",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          {Boolean(errors?.length) && (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <HighlightOffIcon color="error" fontSize="small" />
              <Typography
                color="#d32f2f"
                sx={{ marginLeft: ".5rem", marginRight: ".5rem" }}
              >
                {errors?.length}
              </Typography>
            </Box>
          )}
          {Boolean(warnings?.length) && (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <WarningAmberOutlinedIcon color="warning" fontSize="small" />{" "}
              <Typography
                color="#ed6c02"
                sx={{ marginLeft: ".5rem", marginRight: ".5rem" }}
              >
                {warnings?.length}
              </Typography>
            </Box>
          )}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <InfoOutlinedIcon color="primary" fontSize="small" />{" "}
            <Typography color="#1976d2" sx={{ marginLeft: ".5rem" }}>
              {showData && showTimeUnitSelector ? "2" : "1"}
            </Typography>
          </Box>
        </Box>
      </Button>
      <Collapse
        sx={{
          border: "1px solid rgba(0, 0, 0, 0.2)",
          borderTop: "none",
          transition: "all .35s ease-in",
          backgroundColor: "whitesmoke",
          marginBottom: ".5rem",
        }}
        timeout={350}
        easing="ease-in"
        in={isOpen}
        component="div"
      >
        {errors.map((error) => (
          <Alert
            icon={<HighlightOffIcon />}
            sx={{
              height: "3rem",
              borderLeft: "5px solid #d32f2f",
              margin: ".1rem",
            }}
            key={error}
            severity="error"
          >
            {error}
          </Alert>
        ))}
        {warnings.map((warning) => (
          <Alert
            sx={{
              height: "3rem",
              borderLeft: "5px solid #ed6c02",
              margin: ".2rem",
            }}
            key={warning}
            severity="warning"
          >
            {warning}
          </Alert>
        ))}
        {fileName && (
          <Alert
            sx={{
              height: "3rem",
              borderLeft: "5px solid #0288d1",
              margin: ".2rem",
            }}
            severity="info"
          >
            {fileName}
          </Alert>
        )}
        {showData && (
          <SetUnits
            state={state}
            firstTime={firstTime}
            setHasTimeUnitChanged={setHasTimeUnitChanged}
          />
        )}
      </Collapse>
    </Box>
  );
};
