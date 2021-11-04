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


import { AuceChartDataVsTime, AuceChartFitsVsConcentration } from './AuceChart'
import {selectDatasetProtocols, selectProtocolById} from '../protocols/protocolsSlice';
import {
  selectBiomarkerTypesByDatasetId, selectBiomarkerTypeById
} from '../datasets/biomarkerTypesSlice';

import { selectSubjectById } from '../datasets/subjectsSlice'


import { api } from '../../Api'

const useStyles = makeStyles((theme) => ({
  root: {
    marginTop: theme.spacing(2),
    flexGrow: 1,
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
  },
 
}));



export default function AuceDetail({project, dataset}) {
  const classes = useStyles();
  const [auce, setAuce] = useState(null);
  const [biomarkerTypeId, setBiomarkerTypeId] = useState(null);
  const biomarker_type = useSelector(
    (state) => biomarkerTypeId ?
      selectBiomarkerTypeById(state, biomarkerTypeId) : null
  )

  console.log('biomarker_type', biomarker_type)

  const biomarkerTypes = useSelector(
    state => selectBiomarkerTypesByDatasetId(state, dataset.id)
  );

  useEffect(() => {
    if (biomarkerTypeId != null) {
      api.post(
        `/api/auce/`, {
          biomarker_type_id: biomarkerTypeId, 
        }
      ).then(setAuce)
    }
  }, [biomarkerTypeId]);

  const handleBiomarkerTypeChange = (event) => {
    setBiomarkerTypeId(event.target.value)
  }

  console.log('auce', auce)

  return (
    <div className={classes.root}>
    
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

    { auce &&
    <AuceChartDataVsTime
      auces={auce} 
      biomarker_type={biomarker_type}
    />
    }

    { auce &&
    <AuceChartFitsVsConcentration
      auces={auce} 
      biomarker_type={biomarker_type}
    />
    }

    </div>

  )
}
