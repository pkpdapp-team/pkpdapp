import { StepperState } from "./LoadDataStepper";

export function findFieldByType(name: string, state: StepperState) {
  return (
    state.fields.find((field) => state.normalisedFields.get(field) === name) ||
    name
  );
}
