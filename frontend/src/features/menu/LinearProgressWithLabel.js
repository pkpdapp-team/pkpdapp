import React from "react";
import Box from "@material-ui/core/Box";
import LinearProgress from "@material-ui/core/LinearProgress";
import Typography from '@material-ui/core/Typography';


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
