import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Button from "@mui/material/Button";
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import makeStyles from '@mui/styles/makeStyles';
import { selectAllInferences } from "../inference/inferenceSlice";
import Table from '@mui/material/Table';
import TableCell from '@mui/material/TableCell';
import Tooltip from "@mui/material/Tooltip";
import TableContainer from '@mui/material/TableContainer';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';

import Typography from "@mui/material/Typography";
import DialogActions from "@mui/material/DialogActions";

import LinearProgressWithLabel from '../menu/LinearProgressWithLabel'

const useStyles = makeStyles((theme) => ({
  container: {
  },
  paper: {
    padding: theme.spacing(2),
    textAlign: "left",
  },
  controlsRoot: {
    display: "flex",
    alignItems: "center",
  },
  controls: {
    margin: theme.spacing(1),
  },
}));



export default function InferenceListDialog({ project, onClose, model_type, model, open }) {
  const classes = useStyles();
  const [value, setValue] = React.useState(0);
  const handleClose = () => {
    onClose();
  };

  let items = useSelector(selectAllInferences);
  const pd_models = useSelector(state => state.pdModels.entities);
  const pk_models = useSelector(state => state.pkModels.entities);
  const datasets = useSelector(state => state.datasets.entities);
  // fetch model and dataset name
  if (items) {
    items = items.map(item => {
      const model_id = item.metadata.model.id;
      const dataset_id = item.metadata.dataset;
      const dataset = datasets[dataset_id];
      const model_type = item.metadata.model.form;
      let model = null
      if (model_type === 'PK') {
        model = pk_models[model_id] 
      }
      if (model_type === 'PD') {
        model = pd_models[model_id] 
      }
      console.log(item, model, dataset)
      return {...item, model, dataset}
    })
  }

  const handleRowClick = (item) => {
    onClose(item);
  }

  const column_headings = [
    {label: 'Name', help: 'Name'},
    {label: 'Description', help: 'Description'},
    {label: 'Model', help: 'Model'},
    {label: 'Dataset', help: 'Dataset'},
    {label: 'Progress', help: 'Progress'},
  ]

  console.log('inference', items)

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='md' fullWidth>
    <DialogContent className={classes.dialogPaper}>
    <Typography variant="h5">
     Choose an inference 
    </Typography>
    <TableContainer>
      <Table className={classes.table} size="small" >
        <TableHead>
          <TableRow >
            {column_headings.map(heading => (
            <TableCell key={heading.label}>
              <Tooltip title={heading.help}>
                <Typography>
                  {heading.label}
                </Typography>
              </Tooltip>
            </TableCell>
            
            ))
            }
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => {
            const progress =
              (100 * item.number_of_iterations) /
              item.max_number_of_iterations;
            return (
              <React.Fragment key={item.id}>
              <TableRow hover onClick={() => handleRowClick(item)}>
                <TableCell>
                  {item.name}
                </TableCell>
                <TableCell>
                  {item.description}
                </TableCell>
                <TableCell>
                  {item.model?.name}
                </TableCell>
                <TableCell>
                  {item.dataset.name}
                </TableCell>
                <TableCell>
                  <LinearProgressWithLabel value={progress} />
                </TableCell>
              </TableRow> 
              </React.Fragment>
          )
          })}
        </TableBody>
      </Table>
    </TableContainer>
    </DialogContent>
    <DialogActions>
    <Button onClick={handleClose}>Close</Button>
    </DialogActions>
  </Dialog>
  );
}
