import { FC } from "react";
import { Stack, Typography } from "@mui/material";

import TimeIntervalsTable from "./TimeIntervalsTable";
import ThresholdsTable from "./ThresholdsTable";

const SecondaryParameters: FC = () => {
  return (
    <Stack direction="column" spacing={2} useFlexGap>
      <Typography variant="h5" component="h2">
        Define time intervals
      </Typography>
      <TimeIntervalsTable size="small" />
      <Typography variant="h5" component="h2">
        Define thresholds
      </Typography>
      <ThresholdsTable size="small" stickyHeader />
    </Stack>
  );
};

export default SecondaryParameters;
