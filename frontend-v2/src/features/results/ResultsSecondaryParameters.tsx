import { FC } from "react";
import { Box, Button, Collapse, Stack, Typography } from "@mui/material";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { useState } from "react";

import ResultsTimeIntervals from "./ResultsTimeIntervals";
import ResultsThresholds from "./ResultsThresholds";

const buttonSx = {
  transition: "all .35s linear",
  color: "#544f4f",
  backgroundColor: "transparent",
  "&:hover": { backgroundColor: "transparent" },
  borderBottom: "1px solid #dbd6d1",
  borderRadius: 0,
  width: "12rem",
  textTransform: "capitalize",
  display: "flex",
  justifyContent: "flex-start",
};

const ResultsSecondaryParameters: FC = () => {
  const [intervalsOpen, setIntervalsOpen] = useState(false);
  const [thresholdsOpen, setThresholdsOpen] = useState(false);
  const panel = (
    title: string,
    open: boolean,
    setOpen: (open: boolean) => void,
    content: React.ReactNode,
  ) => (
    <Box>
      <Button
        sx={buttonSx}
        disableTouchRipple
        disableElevation
        onClick={() => setOpen(!open)}
        startIcon={open ? <ExpandLess /> : <ExpandMore />}
        aria-expanded={open}
      >
        <Typography component="span">{title}</Typography>
      </Button>
      <Collapse
        sx={{ transition: "all .35s ease-in", marginBottom: ".5rem" }}
        timeout={350}
        easing="ease-in"
        in={open}
        component="div"
      >
        {content}
      </Collapse>
    </Box>
  );

  return (
    <Stack spacing={0} sx={{ mb: 2, alignItems: "center" }}>
      {panel(
        "Time intervals",
        intervalsOpen,
        setIntervalsOpen,
        <ResultsTimeIntervals />,
      )}
      {panel(
        "Thresholds",
        thresholdsOpen,
        setThresholdsOpen,
        <ResultsThresholds />,
      )}
    </Stack>
  );
};

export default ResultsSecondaryParameters;
