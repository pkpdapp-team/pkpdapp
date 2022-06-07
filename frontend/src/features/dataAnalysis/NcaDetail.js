import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { makeStyles } from "@material-ui/core/styles";

import Select from "@material-ui/core/Select";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";

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
  const [protocolId, setProtocolId] = useState(null);
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
  

  console.log("biomarker_type", biomarker_type);

  const protocols = useSelector((state) =>
    selectDatasetById(state, dataset.id).protocols
  );

  const protocol = (protocols && protocolId) ? 
    protocols.find(p => p.id === protocolId)
    : null

  const subject = useSelector((state) =>
    protocol ? selectSubjectById(state, protocol.subject) : null
  );

  const biomarkerTypes = useSelector((state) =>
    selectBiomarkerTypesByDatasetId(state, dataset.id)
  );

  const subjectsInBiomarkerType = biomarkerTypeId
    ? biomarker_type.data.subjects
    : null;

  const filteredProtocols = subjectsInBiomarkerType && protocol && protocol.subjects
    ? protocols.filter((protocol) =>
      subjectsInBiomarkerType.filter(x => protocol.subjects.includes(x))
    )
    : protocols;

  useEffect(() => {
    if (biomarkerTypeId != null && protocolId != null) {
      api
        .post(`/api/nca/`, {
          biomarker_type_id: biomarkerTypeId,
          protocol_id: protocolId,
        })
        .then(setNca);
    }
  }, [biomarkerTypeId, protocolId]);

  const handleProtocolChange = (event) => {
    setProtocolId(event.target.value);
  };
  const handleBiomarkerTypeChange = (event) => {
    setBiomarkerTypeId(event.target.value);
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
        <InputLabel id="protocol-label">Protocol</InputLabel>
        <Select
          onChange={handleProtocolChange}
          labelId="protocol-label"
          value={protocolId || ""}
        >
          {filteredProtocols.map((protocol, i) => {
            return (
              <MenuItem key={protocol.id} value={protocol.id}>
                {protocol.name}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>

      {nca && (
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

      {nca && (
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
