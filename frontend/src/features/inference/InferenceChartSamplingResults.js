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

export default function InferenceChartSamplingResults({ chains, inference, algorithm }) {
  const classes = useStyles();
  const variables = useSelector((state) => {
    if (inference.pd_model) {
      return selectVariablesByPdModel(state, inference.pd_model);
    } else if (inference.dosed_pk_model) {
      return selectVariablesByDosedPkModel(state, inference.dosed_pk_model);
    }
  });


  const priorsWithSamples = inference.priors.map(prior => (
    {
      ...prior, 
      samples: chains.reduce((sum, chain) => (
        sum.concat(chain.data.values.filter((x, i) => chain.data.priors[i] === prior.id))
      ), []),
    }
  ))

  const rows = priorsWithSamples.map(prior => {
    const variable = variables.find(v => v.id === prior.variable)
    const name = variable ? variable.name : 'Not found'
    const number_of_samples = prior.samples.length
    const mean = (
      prior.samples.reduce((sum, x) => sum + x, 0) / number_of_samples
    ).toFixed(2)
    const stddev = (
      Math.sqrt(prior.samples.reduce((sum, x) => sum + (x - mean)**2, 0) / number_of_samples)
    ).toFixed(2)
    return {
      name,
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
