import { FC } from "react";
import { Box, Stack, Typography } from "@mui/material";

import TimeIntervalsTable from "./TimeIntervalsTable";
import ThresholdsTable from "./ThresholdsTable";
import HelpButton from "../../../components/HelpButton";

const SecondaryParameters: FC = () => {
  return (
    <Stack direction="column" spacing={2} useFlexGap>
      <TimeIntervalsTable size="small" />
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Typography id="thresholds-table-heading" variant="h5" component="h2">
          Define thresholds and Variable Units
        </Typography>
        <HelpButton title="Define thresholds and Variable Units">
          <p>
            For each concentration variable, set a lower and upper threshold and
            the unit used to display and report its results.
          </p>
          <p>
            Together with the time intervals above, the thresholds are used to
            calculate secondary parameters such as the time spent above the
            lower and upper thresholds within each interval.
          </p>
          <p>
            The variable units selected here determine the units used to display
            and report secondary parameters in the Results tables.
          </p>
        </HelpButton>
      </Box>
      <ThresholdsTable
        size="small"
        stickyHeader
        aria-labelledby="thresholds-table-heading"
      />
    </Stack>
  );
};

export default SecondaryParameters;
