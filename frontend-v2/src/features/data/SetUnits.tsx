import {
  Alert,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Typography
} from "@mui/material";
import { StepperState } from "./LoadDataStepper";
import { useProjectRetrieveQuery, useUnitListQuery } from "../../app/backendApi";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";

interface IMapObservations {
  state: StepperState;
  firstTime: boolean;
}

const SetUnits: React.FC<IMapObservations> = ({state, firstTime}: IMapObservations) => {
  const projectId = useSelector((state: RootState) => state.main.selectedProject);
  const { data: project, isLoading: isProjectLoading } = useProjectRetrieveQuery({id: projectId || 0}, { skip: !projectId })
  const { data: units, isLoading: isLoadingUnits } = useUnitListQuery({ compoundId: project?.compound}, { skip: !project || !project.compound});

  if (isProjectLoading || isLoadingUnits) {
    return <Typography variant="h5">Loading...</Typography>
  }

  if (!project || !units) {
    return <Typography variant="h5">No project or units found</Typography>
  }

  const secondUnit = units.find((unit) => unit.symbol === "s");
  const timeUnits = secondUnit?.compatible_units.map((unit) => unit.symbol);
  const timeUnitOptions = timeUnits?.map((unit) => ({ value: unit, label: unit })) || [];

  const noTimeUnit = !state.normalisedFields.find((field) => field === "Time Unit");

  function setTimeUnit(event: SelectChangeEvent) {
    state.setTimeUnit(event.target?.value);
    const newData = state.data.map(row => ({
      ...row,
      'Time_unit': event.target?.value
    }));
    state.setData(newData);
  }
  return (
    <div>
      {noTimeUnit && (
        <Alert severity="error">
          <Stack direction='row' spacing='1rem'>
            <Typography>Please select a unit for all time values.</Typography>
            <FormControl sx={{ minWidth: '10rem' }}>
              <InputLabel id='select-time-unit-label'>Set Time Unit</InputLabel>
              <Select
                labelId='select-time-unit-label'
                value={state.timeUnit || ''}
                onChange={setTimeUnit}
              >
                {timeUnitOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Alert>
      )}
    </div>

  )
}

export default SetUnits;

 