import React from "react";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from '@mui/material/Typography';


export default function LinearProgressWithLabel(props) {
  return (
    <Box display="flex" alignItems="center">
      <Typography
        variant="body2"
        color="textSecondary"
      >{`${props.value}%`}</Typography>
      <Box width="100%" ml={1}>
        <LinearProgress variant="determinate" value={props.value} />
      </Box>
    </Box>
  );
}
