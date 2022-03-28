import React from "react";
import { useSelector } from "react-redux";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";

import {
  selectVariablesByPdModel,
  selectVariablesByDosedPkModel,
} from "../variables/variablesSlice";



const useStyles = makeStyles((theme) => ({
  root: {
    height: "85vh",
    width: "100%",
  },
}));

export default function InferenceChartSamplingResults({ inference, priorsWithChainValues }) {
  const classes = useStyles();
  

  const rows = priorsWithChainValues.map(prior => {
    const number_of_samples = prior.chains.map(
      c => c.values.length
    ).reduce((sum, x) => sum + x, 0)
    const mean = (
      prior.chains.reduce((sum, chain) => sum + chain.values.reduce((sum, x) => sum + x, 0), 0) / number_of_samples
    ).toFixed(2)
    const stddev = Math.sqrt(prior.chains.reduce((sum, chain) => 
      sum + chain.values.map(x => (x - mean)**2).reduce((sum, x) => sum + x, 0)
        , 0
      ) / number_of_samples
    ).toFixed(2)
    return {
      name: prior.name,
      number_of_samples,
      mean,
      stddev
    }
  });
    
  return (
    <div className={classes.root}>
      <Typography>
        Number of iterations: {inference.number_of_iterations} / {inference.max_number_of_iterations}
      </Typography>
      <Typography>
        Number of function evaluations: {inference.number_of_function_evals}
      </Typography>
      <Typography>
        Number of chains: {inference.number_of_chains}
      </Typography>

    <TableContainer>
      <Table sx={{ minWidth: 650 }} size="small" aria-label="a dense table">
        <TableHead>
          <TableRow>
            <TableCell>Variable</TableCell>
            <TableCell align="right">Samples</TableCell>
            <TableCell align="right">Mean</TableCell>
            <TableCell align="right">Std Dev</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.name}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell component="th" scope="row">
                {row.name}
              </TableCell>
              <TableCell align="right">{row.number_of_samples}</TableCell>
              <TableCell align="right">{row.mean}</TableCell>
              <TableCell align="right">{row.stddev}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    </div>
  );
}
