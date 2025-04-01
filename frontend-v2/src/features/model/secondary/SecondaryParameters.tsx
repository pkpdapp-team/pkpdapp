import { FC } from "react";
import { Stack, Typography } from "@mui/material";

import TimeIntervalsTable from "./TimeIntervalsTable";
import ThresholdsTable from "./ThresholdsTable";

const SecondaryParameters: FC = () => {
  return (
    <Stack direction="column" spacing={2} useFlexGap>
      <TimeIntervalsTable size="small" />
      <Typography variant="h5" component="h2">
        Define thresholds and Variable Units
      </Typography>
      <ThresholdsTable size="small" stickyHeader />
    </Stack>
  );
};

export default SecondaryParameters;
