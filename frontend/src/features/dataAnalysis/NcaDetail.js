import React, { useEffect, useState } from "react";
import { useSelector } from 'react-redux'
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Alert from '@material-ui/lab/Alert';
import { useForm } from "react-hook-form";
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';

import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';


import {selectDatasetProtocols} from '../protocols/protocolsSlice';
import {selectBiomarkerTypesByDatasetId} from '../datasets/biomarkerTypesSlice';


import { api } from '../../Api'

const useStyles = makeStyles((theme) => ({
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
  },
 
}));



export default function NcaDetail({project, dataset}) {
  const classes = useStyles();
  const [nca, setNca] = useState(null);
  const [protocolId, setProtocolId] = useState(null);
  const [biomarkerTypeId, setBiomarkerTypeId] = useState(null);

  const protocols = useSelector(
    state => selectDatasetProtocols(state, dataset)
  );

  const biomarkerTypes = useSelector(
    state => selectBiomarkerTypesByDatasetId(state, dataset.id)
  );

  useEffect(() => {
    if (biomarkerTypeId != null && protocolId != null) {
      api.get(
        `/api/nca/`, {
          biomarker_type_id: biomarkerTypeId, 
          protocol_id: protocolId
        }
      ).then(setNca)
    }
  }, [biomarkerTypeId, protocolId]);

  const handleProtocolChange = (event) => {
    setProtocolId(event.target.value)
  }
  const handleBiomarkerTypeChange = (event) => {
    setBiomarkerTypeId(event.target.value)
  }

  console.log('nca', nca)

  return (
    <div>

    <FormControl className={classes.formControl}>
    <InputLabel id="protocol-label">
      Protocol
    </InputLabel>
    <Select
      onChange={handleProtocolChange}
      labelId="protocol-label"
      value={protocolId || ''}
    >
      {protocols.map((protocol, i) => {
        return (
          <MenuItem key={protocol.id} value={protocol.id}>
            {protocol.name}
          </MenuItem>
        )
      })}
    </Select>
    </FormControl>
    <FormControl className={classes.formControl}>
    <InputLabel id="biomarker-type-label">
      Variable 
    </InputLabel>
    <Select
      onChange={handleBiomarkerTypeChange}
      value={biomarkerTypeId || ''}
      labelId="biomarker-type-label"
    >
      {biomarkerTypes.map((bt, i) => {
        return (
          <MenuItem key={bt.id} value={bt.id}>
            {bt.name}
          </MenuItem>
        )
      })}
    </Select>
    </FormControl>
    </div>

  )
}
