import { FC, useState } from "react";
import { useSelector } from "react-redux";
import { useProjectRetrieveQuery, useUnitListQuery } from "../../app/backendApi";
import { RootState } from "../../app/store";
import { Button, Typography } from "@mui/material";
import { DataGrid } from '@mui/x-data-grid';
import LoadDataStepper from "./LoadDataStepper";
import useDataset from "../../hooks/useDataset";

const Data:FC = () => {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;
  const { data: project, isLoading: isProjectLoading } =
    useProjectRetrieveQuery({ id: projectIdOrZero }, { skip: !projectId }
  );
  const { data: units, isLoading: isUnitsLoading } = useUnitListQuery(
    { compoundId: project?.compound || 0 },
    { skip: !project?.compound },
  );
  const { dataset, subjectBiomarkers } = useDataset(projectIdOrZero);
  const [isLoading, setIsLoading] = useState(false);
  function handleNewUpload() {
    setIsLoading(true);
  }
  function onUploadComplete() {
    setIsLoading(false);
  }
  const protocols = dataset?.protocols || [];
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
  const dosingColumns = dosingRows[0] ? Object.keys(dosingRows[0]).map((field) => ({ field, headerName: field })) : [];
  const observations = subjectBiomarkers?.flatMap(biomarkerRows => biomarkerRows.map((row) => {
    const group = dataset?.groups?.find(group => group.subjects.includes(row.subjectId));
    return  ({
      ...row,
      unit: row.unit?.symbol,
      timeUnit: row.timeUnit?.symbol,
      group: group?.name
    })
  })) || [];
  const [firstRow] = observations;
  const columns = firstRow ? Object.keys(firstRow).map((field) => ({ field, headerName: field })) : [];

  return isLoading ?
    <LoadDataStepper onFinish={onUploadComplete}  /> :
    <>
      <Button variant="outlined" onClick={handleNewUpload}>
        Upload new dataset
      </Button>
      <Typography variant="h6" component="h2" gutterBottom>
        Protocols
      </Typography>
      <DataGrid
        rows={dosingRows}
        columns={dosingColumns}
        autoHeight
      />
      <Typography variant="h6" component="h2" gutterBottom>
        Observations
      </Typography>
      <DataGrid
        rows={observations}
        columns={columns}
        autoHeight
      />
    </>;
}

export default Data;
