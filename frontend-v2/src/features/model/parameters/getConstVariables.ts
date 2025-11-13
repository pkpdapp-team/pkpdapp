import {
  CombinedModelRead,
  ProjectRead,
  VariableRead,
} from "../../../app/backendApi";
import paramPriority from "./paramPriority";

// filter out parameters from all variables, and sort them by priority
export const getConstVariables = (
  variables: VariableRead[],
  model: CombinedModelRead,
) => {
  let constVariables = variables.filter((variable) => variable.constant);
  if (model.is_library_model) {
    constVariables = constVariables.filter(
      (variable) => variable.name !== "C_Drug",
    );
    // if Aa or Atr1-10 is not dosed, then we will filter out F and ka (for library models)
    const aaIsNotDosed =
      variables.filter(
        (variable) => variable.protocol && (variable.name.startsWith("Aa") || variable.name.startsWith("Atr")),
      ).length === 0;
    if (aaIsNotDosed) {
      constVariables = constVariables.filter(
        (variable) => !["F", "ka"].includes(variable.name),
      );
    }
  }
  constVariables.sort((a, b) => {
    const overallOrder = paramPriority(a) - paramPriority(b);
    if (overallOrder !== 0) {
      // first sort by priority
      return overallOrder;
    } else {
      // otherwise use alphabetical ordering
      return a.name.localeCompare(b.name);
    }
  });
  return constVariables;
};

export const getNoReset = (project: ProjectRead) =>
  !project.species || project.species === "O";

