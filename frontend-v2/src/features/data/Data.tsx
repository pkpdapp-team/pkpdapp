import { FC, useState } from "react";
import { useSelector } from "react-redux";
import { useProjectRetrieveQuery, useUnitListQuery } from "../../app/backendApi";
import { RootState } from "../../app/store";
import { Box, Button, Typography } from "@mui/material";
import { DataGrid } from '@mui/x-data-grid';
import LoadDataStepper from "./LoadDataStepper";
import useDataset from "../../hooks/useDataset";

const Data:FC = () => {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;
  const { data: project } =
    useProjectRetrieveQuery({ id: projectIdOrZero }, { skip: !projectId }
  );
  const { data: units } = useUnitListQuery(
    { compoundId: project?.compound || 0 },
    { skip: !project?.compound },
  );
  const { dataset, protocols, subjectBiomarkers } = useDataset(projectIdOrZero);
  const [isLoading, setIsLoading] = useState(false);

  function handleNewUpload() {
    setIsLoading(true);
  }

  function onUploadComplete() {
    setIsLoading(false);
  }

  function onCancel() {
    setIsLoading(false);
  }

  const dosingRows = protocols.flatMap(protocol => {
    const amountUnit = units?.find(unit => unit.id === protocol.amount_unit)?.symbol || '';
    const timeUnit = units?.find(unit => unit.id === protocol.time_unit)?.symbol || '';
    const qname = protocol.mapped_qname;
    return protocol.doses.map(dose => ({
      id: protocol.id,
      amount: dose.amount,
      amountUnit,
      startTime: dose.start_time,
      timeUnit,
      duration: dose.duration,
      repeats: dose.repeats,
      repeatInterval: dose.repeat_interval,
      qname
    }))
  });
  const dosingColumns = dosingRows[0] ? Object.keys(dosingRows[0]).map((field) => ({
    field,
    headerName: field,
    minWidth: field === 'qname' ? 200 : 50
  })) : [];
  const observations = subjectBiomarkers?.flatMap(biomarkerRows => biomarkerRows.map((row) => {
    const group = dataset?.groups?.find(group => group.subjects.includes(row.subjectId));
    return  ({
      ...row,
      unit: row.unit?.symbol,
      timeUnit: row.timeUnit?.symbol,
      group: group?.name
    })
  }))
  .map((row, index) => ({ ...row, id: index + 1 })) || [];
  const [firstRow] = observations;
  const columns = firstRow ? Object.keys(firstRow).map((field) => ({
    field,
    headerName: field,
    minWidth: field === 'qname' ? 200 : 50
  })) : [];

  return isLoading ?
    <LoadDataStepper onFinish={onUploadComplete} onCancel={onCancel}  /> :
    <>
      <Box sx={{ display: 'flex', justifyContent: 'end' }}>
        <Button
          variant="outlined"
          onClick={handleNewUpload}
        >
          Upload new dataset
        </Button>
      </Box>
      {dosingRows.length !== 0 && 
        <>
          <Typography variant="h6" component="h2" gutterBottom>
            Protocols
          </Typography>
          <DataGrid
            rows={dosingRows}
            columns={dosingColumns}
            autoHeight
          />
        </>  
      }
      {observations.length !== 0 &&
        <>
          <Typography variant="h6" component="h2" gutterBottom>
            Observations
          </Typography>
          <DataGrid
            rows={observations}
            columns={columns}
            autoHeight
          />
        </>
      }
    </>;
}

export default Data;
