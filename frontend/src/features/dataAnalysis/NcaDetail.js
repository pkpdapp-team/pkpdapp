import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import makeStyles from '@mui/styles/makeStyles';

import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";

import { NcaChart } from "./NcaChart";
import {
  selectProtocolById,
} from "../protocols/protocolsSlice";
import {
  selectDatasetById,
} from "../datasets/datasetsSlice";
import {
  selectBiomarkerTypesByDatasetId,
  selectBiomarkerTypeById,
} from "../datasets/biomarkerTypesSlice";

import { selectSubjectById } from "../datasets/subjectsSlice";

import { api } from "../../Api";

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

export default function NcaDetail({ project, dataset }) {
  const classes = useStyles();
  const [nca, setNca] = useState(null);
  const [subjectId, setSubjectId] = useState(null);
  const [mode, setMode] = useState("data");
  const modeOptions = [
    { key: "Data", value: "data" },
    { key: "Maximum and Extrapolation", value: "extrapolation" },
    { key: "Area Under the Curve", value: "auc" },
    { key: "Area Under the First Moment", value: "aucm" },
  ];

  const [biomarkerTypeId, setBiomarkerTypeId] = useState(null);
  const biomarker_type = useSelector((state) =>
    biomarkerTypeId ? selectBiomarkerTypeById(state, biomarkerTypeId) : null
  );
  

  const subject = useSelector((state) =>
    subjectId ? selectSubjectById(state, subjectId) : null
  );

  const biomarkerTypes = useSelector((state) =>
    selectBiomarkerTypesByDatasetId(state, dataset.id)
  );

  const subjectsEntities = useSelector((state) => state.subjects.entities);

  const subjectsInBiomarkerType = biomarkerTypeId
    ? [... new Set(biomarker_type.data.subjects)]
    : []; 

  const subjectOptions = subjectsInBiomarkerType.filter(s_id => 
    (subjectsEntities[s_id].protocol)
  ).map(s_id => ({
    key: subjectsEntities[s_id].id_in_dataset, value: s_id
  }))

  useEffect(() => {
    if (biomarkerTypeId != null && subjectId != null) {
      api
        .post(`/api/nca/`, {
          biomarker_type_id: biomarkerTypeId,
          subject_id: subjectId,
        })
        .then(setNca);
    } else {
      setNca(null)
    }
  }, [biomarkerTypeId, subjectId]);

  const handleSubjectChange = (event) => {
    setSubjectId(event.target.value);
  };
  const handleBiomarkerTypeChange = (event) => {
    setBiomarkerTypeId(event.target.value);
    setSubjectId(null);
  };
  const handleModeChange = (event) => {
    setMode(event.target.value);
  };

  console.log("nca", nca);

  return (
    <div className={classes.root}>
      <FormControl className={classes.formControl}>
        <InputLabel id="biomarker-type-label">Variable</InputLabel>
        <Select
          onChange={handleBiomarkerTypeChange}
          value={biomarkerTypeId || ""}
          labelId="biomarker-type-label"
        >
          {biomarkerTypes.map((bt, i) => {
            return (
              <MenuItem key={bt.id} value={bt.id}>
                {bt.name}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>

      <FormControl className={classes.formControl}>
        <InputLabel id="subject-label">Subject</InputLabel>
        <Select
          onChange={handleSubjectChange}
          labelId="subject-label"
          value={subjectId || ""}
        >
          {subjectOptions.map((s, i) => {
            return (
              <MenuItem key={s.value} value={s.value}>
                {s.key}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>


      {nca && subject && (
        <FormControl className={classes.formControl}>
          <InputLabel id="mode-label">Show</InputLabel>
          <Select
            onChange={handleModeChange}
            labelId="mode-label"
            value={mode || ""}
          >
            {modeOptions.map((mode, i) => {
              return (
                <MenuItem key={mode.value} value={mode.value}>
                  {mode.key}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      )}

      {nca && subject && (
        <NcaChart
          nca={nca}
          biomarker_type={biomarker_type}
          subject={subject}
          mode={mode}
        />
      )}
    </div>
  );
}
