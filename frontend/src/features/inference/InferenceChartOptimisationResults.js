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

export default function InferenceChartOptimisationResults({ chains, inference, algorithm }) {
  const classes = useStyles();
  const variables = useSelector((state) => {
    if (inference.pd_model) {
      return selectVariablesByPdModel(state, inference.pd_model);
    } else if (inference.dosed_pk_model) {
      return selectVariablesByDosedPkModel(state, inference.dosed_pk_model);
    }
  });

  const priorsWithChainValues = inference.priors.map(prior => (
    {
      ...prior, 
      chains: chains.map(chain => chain.data.values.filter((x, i) => chain.data.priors[i] === prior.id)),
    }
  ))

  const rows = priorsWithChainValues.map(prior => {
    const variable = variables.find(v => v.id === prior.variable)
    const name = variable ? variable.name : 'Not found'
    const final_values = prior.chains.map(chain => chain[chain.length - 1].toFixed(2))
    return {
      name,
      final_values,
    }
  });
  console.log('InferenceChartOptimisationResults', priorsWithChainValues)
    
  return (
    <div className={classes.root}>
      <Typography>
        Number of iterations: {inference.number_of_iterations} / {inference.max_number_of_iterations}
      </Typography>
      <Typography>
        Number of function evaluations: {inference.number_of_function_evals}
      </Typography>
    <TableContainer >
      <Table sx={{ minWidth: 650 }} size="small" aria-label="a dense table">
        <TableHead>
          <TableRow>
            <TableCell>Variable</TableCell>
            { Array(inference.number_of_chains).fill().map((_, i) => (
              <TableCell align="right">{`Final ${i}`}</TableCell>
            ))}
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
              { Array(inference.number_of_chains).fill().map((_, i) => (
                <TableCell align="right">{row.final_values[i]}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    </div>
  );
}
