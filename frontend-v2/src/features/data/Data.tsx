import { FC, useState } from "react";
import { useSelector } from "react-redux";
import { useProjectRetrieveQuery, useUnitListQuery } from "../../app/backendApi";
import { RootState } from "../../app/store";
import { Box, Button, Tab, Tabs, Typography } from "@mui/material";
import { DataGrid } from '@mui/x-data-grid';
import LoadDataStepper from "./LoadDataStepper";
import useDataset from "../../hooks/useDataset";

function displayUnitSymbol(symbol: string | undefined) {
  return symbol === '' ? 'dimensionless' : symbol;
}

const Data:FC = () => {
  const [tab, setTab] = useState(0);
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
  const { dataset, groups, subjectBiomarkers } = useDataset(projectIdOrZero);
  const [isLoading, setIsLoading] = useState(false);

  function handleNewUpload() {
    if (groups.length === 0 || window.confirm('Are you sure you want to delete the current dataset?')) {
      setIsLoading(true);
    }
  }

  function onUploadComplete() {
    setIsLoading(false);
  }

  function onCancel() {
    setIsLoading(false);
  }

  function handleTabChange(event: React.SyntheticEvent, newValue: number) {
    setTab(newValue);
  }

  function a11yProps(index: number) {
    return {
      id: `group-tab-${index}`,
      'aria-controls': 'group-tabpanel'
    };
  }

  const group = groups[tab];
  const protocols = group?.protocols || [];
  const dosingRows = protocols.flatMap(protocol => {
    const amountUnit = units?.find(unit => unit.id === protocol.amount_unit)?.symbol || '';
    const timeUnit = units?.find(unit => unit.id === protocol.time_unit)?.symbol || '';
    const qname = protocol.mapped_qname;
    const doseType = protocol.dose_type;
    return protocol.doses.map(dose => ({
      id: dose.id,
      Amount: dose.amount,
      'Amount Unit': amountUnit,
      Time: dose.start_time,
      'Time Unit': timeUnit,
      Duration: dose.duration,
      Route: doseType,
      'Additional Doses': (dose?.repeats || 1) - 1,
      'Interdose Interval': dose.repeat_interval,
      'Amount Variable': qname
    }))
  });
  const dosingColumns = dosingRows[0] ? Object.keys(dosingRows[0]).map((field) => ({
    field,
    headerName: field,
    minWidth: field === 'Amount Variable' ? 150 :
        field.length > 10 ? 130 : 30
  })) : [];
  const groupId = group?.id_in_dataset || group?.name;
  const observations = subjectBiomarkers?.flatMap(biomarkerRows => biomarkerRows.map((row) => {
    const group = dataset?.groups?.find(group => group.subjects.includes(row.subjectId));
    const groupId = group?.id_in_dataset || group?.name;
    return  ({
      id: row.id,
      'Subject ID': row.subjectDatasetId,
      'Time': row.time,
      'Time Unit': row.timeUnit?.symbol,
      'Observation': row.value,
      'Observation Unit': displayUnitSymbol(row.unit?.symbol),
      'Observation ID': row.label,
      'Observation Variable': row.qname,
      Group: groupId,
    })
  }))
  .filter(row => row.Group === groupId)
  .map((row, index) => ({ ...row, id: index + 1 })) || [];
  const [firstRow] = observations;
  const columns = firstRow ? Object.keys(firstRow).map((field) => ({
    field,
    headerName: field,
    minWidth: field === 'Observation Variable' ? 150 :
      field.length > 10 ? 120 : 30
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
      <Tabs value={tab} onChange={handleTabChange}>ß
        {groups?.map((group, index) => (
          <Tab
            key={group.id}
            label={group.name}
            {...a11yProps(index)}
          />
        ))}
      </Tabs>
      <Box role="tabpanel" id={`group-tabpanel`}>
        {dosingRows.length !== 0 && 
          <Box padding={1}>
            <Typography variant="h6" component="h2" gutterBottom>
              Protocols
            </Typography>
            <DataGrid
              rows={dosingRows}
              columns={dosingColumns}
              autoHeight
            />
          </Box>  
        }
        {observations.length !== 0 &&
          <Box padding={1}>
            <Typography variant="h6" component="h2" gutterBottom>
              Observations
            </Typography>
            <DataGrid
              rows={observations}
              columns={columns}
              autoHeight
            />
          </Box>
        }
      </Box>
    </>;
}

export default Data;
