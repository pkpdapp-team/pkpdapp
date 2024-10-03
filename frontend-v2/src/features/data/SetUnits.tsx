import { FC, useState } from "react";
import {
  Alert,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Typography,
} from "@mui/material";
import { StepperState } from "./LoadDataStepper";
import {
  useProjectRetrieveQuery,
  useUnitListQuery,
} from "../../app/backendApi";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { validateState } from "./dataValidation";

interface IMapObservations {
  state: StepperState;
  firstTime: boolean;
}

const SetUnits: FC<IMapObservations> = ({
  state,
  firstTime,
}: IMapObservations) => {
  const [isChanged, setIsChanged] = useState<boolean>(false);
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const { data: project, isLoading: isProjectLoading } =
    useProjectRetrieveQuery({ id: projectId || 0 }, { skip: !projectId });
  const { data: units, isLoading: isLoadingUnits } = useUnitListQuery(
    { compoundId: project?.compound },
    { skip: !project || !project.compound },
  );

  if (isProjectLoading || isLoadingUnits) {
    return <Typography variant="h5">Loading...</Typography>;
  }

  if (!project || !units) {
    return <Typography variant="h5">No project or units found</Typography>;
  }

  const normalisedHeaders = state.normalisedHeaders;
  const secondUnit = units.find((unit) => unit.symbol === "s");
  const timeUnits = secondUnit?.compatible_units.map((unit) => unit.symbol);
  const timeUnitOptions =
    timeUnits?.map((unit) => ({ value: unit, label: unit })) || [];

  const noTimeUnit = !normalisedHeaders.find((field) => field === "Time Unit");
  const invalidTimeUnits = state.errors.find((error) =>
    error.includes("file contains multiple time units"),
  );
  const showTimeUnitSelector = noTimeUnit || invalidTimeUnits && isChanged;
  const timeUnitField =
    state.fields.find(
      (field) => state.normalisedFields.get(field) === "Time Unit",
    ) || "Time Unit";

  function setTimeUnit(event: SelectChangeEvent) {
    state.setTimeUnit(event.target?.value);
    const newData = state.data.map((row) => ({
      ...row,
      "Time Unit": event.target?.value,
    }));
    const newNormalisedFields = new Map([
      ...state.normalisedFields.entries(),
      [timeUnitField, "Ignore"],
      ["Time Unit", "Time Unit"],
    ]);
    state.setData(newData);
    state.setNormalisedFields(newNormalisedFields);
    const { errors, warnings } = validateState({
      ...state,
      normalisedFields: newNormalisedFields,
    });
    state.setErrors(errors);
    state.setWarnings(warnings);
    setIsChanged(true);
  }
  return (
    <div>
      {(showTimeUnitSelector || isChanged) && (
        <Alert severity="info" sx={{ display: "flex", alignItems: "center", height: '3rem', borderLeft: '5px solid #0288d1', margin: '.2rem' }}>
          <Stack direction="row" spacing="1rem" sx={{ alignItems: "center" }}>
            <Typography>Please select a unit for all time values.</Typography>
            <FormControl size='small' sx={{ minWidth: "10rem" }} error={!state.timeUnit}>
              <InputLabel id="select-time-unit-label">Set Time Unit</InputLabel>
              <Select
                labelId="select-time-unit-label"
                value={state.timeUnit || ""}
                onChange={setTimeUnit}
              >
                {timeUnitOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Alert>
      )}
    </div>
  );
};

export default SetUnits;
