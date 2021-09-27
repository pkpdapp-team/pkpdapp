import React, { useEffect } from "react";
import { useSelector, useDispatch } from 'react-redux'
import Button from '@material-ui/core/Button';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

import { useForm } from "react-hook-form";
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';

import ComponentForm from '../forms/ComponentForm'
import {FormTextField, FormSelectField} from '../forms/FormComponents';

import {
  selectAllBasePkModels
} from '../pkModels/basePkModelsSlice.js'

import {
  selectAllDatasets
} from '../datasets/datasetsSlice.js'

import {
  selectAllProtocols
} from '../protocols/protocolsSlice.js'

import {
  updatePkModel
} from '../pkModels/pkModelsSlice.js'

const useStyles = makeStyles((theme) => ({
  components: {
    width: '100%',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    paddingLeft: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    '& > *': {
      margin: theme.spacing(1),
    },
  },
}));


export default function PkDetail({project, pk_model}) {
  const classes = useStyles();
  const { control, handleSubmit, reset } = useForm();
  const dispatch = useDispatch();

  const basePkModels = useSelector(selectAllBasePkModels);
  const protocols = useSelector(selectAllProtocols);
  const datasets = useSelector(selectAllDatasets);

  useEffect(() => {
    reset(pk_model);
  }, [reset, pk_model]);

  const onSubmit = (values) => {
    dispatch(updatePkModel(values));
  };

  const base_pk_model_options = basePkModels.map(pk => (
    {key: pk.name, value: pk.id}
  ));

  let protocol_options = [
    {key: 'None', value: ''},
  ];
  protocol_options = protocol_options.concat(
    protocols.map(protocol => (
      {key: protocol.name, value: protocol.id}
    ))
  );
  for (let i = 0; i < datasets.length; i++) {
    const dataset_protocols = datasets[i].protocols.map(protocol => (
    {key: protocol.name, value: protocol.id}
    ));
    protocol_options = protocol_options.concat(dataset_protocols);
  }

  const dose_compartment_options = [
    {key: 'central', value: 'central'},
    {key: 'peripheral1', value: 'peripheral1'},
    {key: 'peripheral2', value: 'peripheral2'},
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
      <FormTextField 
        control={control} 
        defaultValue={pk_model.name}
        name="name" label="Name"
      />
      <Typography>Components</Typography>
      <List>
      {pk_model.components.map((component, index) => {
        return (
          <ListItem key={index} role={undefined} dense >
            <div className={classes.components}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography className={classes.heading}>{component.name}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <ComponentForm control={control} component={component}/>
              </AccordionDetails>
            </Accordion>
            </div>
          </ListItem>
        );
      })}
      </List>

      <FormSelectField 
        control={control} 
        defaultValue={pk_model.pharmacokinetic_model}
        options={base_pk_model_options}
        name="pharmacokinetic_model" label="Base Pharmacokinetic Model"
      />
      <FormSelectField 
        control={control} 
        defaultValue={pk_model.dose_compartment}
        options={dose_compartment_options}
        name="dose_compartment" label="Dose Compartment"
      />
      <FormSelectField 
        control={control} 
        defaultValue={pk_model.protocol}
        options={protocol_options}
        name="protocol" label="Protocol"
      />
      <FormTextField 
        control={control} 
        defaultValue={pk_model.time_max}
        name="time_max" label="Maximum Time"
        type="number"
      />

      <div className={classes.controls}>
      <Button 
        type="submit" 
        variant="contained"
      >
        Save
      </Button>

      </div>
    </form>
  )
}
