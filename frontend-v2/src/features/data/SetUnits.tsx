import { MenuItem, Select, Typography } from "@mui/material";
import { Field, Data } from "./LoadData";
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
  const isPreclinical = project.species !== 'H';
  const amountUnit = isPreclinical ? units.find((unit) => unit.symbol === "pmol/kg") : units.find((unit) => unit.symbol === "pmol");
  const amountUnits = amountUnit?.compatible_units.map((unit) => unit.symbol);
  const amountUnitOptions = amountUnits?.map((unit) => ({ value: unit, label: unit })) || [];

  const noTimeUnit = state.normalisedFields.filter((field) => field === "Time Unit").length === 0;
  const noAmountUnit = state.normalisedFields.filter((field) => field === "Amount Unit").length === 0;
  return (
    <div>
      {noTimeUnit && (
        <div>
          <Typography variant="h5">Set Time Unit</Typography>
          <Select value={state.timeUnit} onChange={(event) => state.setTimeUnit(event.target.value)}>
            {timeUnitOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </Select>
        </div>
      )}
      { noAmountUnit && (
        <div>
          <Typography variant="h5">Set Amount Unit</Typography>
          <Select value={state.amountUnit} onChange={(event) => state.setAmountUnit(event.target.value)}>
            {amountUnitOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </Select>
          </div>
      )}
    </div>

  )
}

export default SetUnits;

 