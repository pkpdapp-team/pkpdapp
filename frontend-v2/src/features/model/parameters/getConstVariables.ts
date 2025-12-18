import { useSelector } from "react-redux";
import {
  CombinedModelRead,
  ProjectRead,
  useCombinedModelListQuery,
  useProjectRetrieveQuery,
  useVariableListQuery,
  VariableRead,
} from "../../../app/backendApi";
import { RootState } from "../../../app/store";
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
        (variable) =>
          variable.protocols &&
          (variable.name == "Avh" ||
            variable.name.startsWith("Aa") ||
            variable.name.startsWith("Atr")),
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

export function useConstVariables() {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;
  const { data: models } = useCombinedModelListQuery(
    { projectId: projectIdOrZero },
    { skip: !projectId },
  );
  const model = models?.[0];
  const { data: variables } = useVariableListQuery(
    { projectId: projectIdOrZero },
    { skip: !projectId },
  );
  if (!model || !variables) {
    return [];
  }
  return getConstVariables(variables, model);
}

export const getNoReset = (project: ProjectRead) =>
  !project.species || project.species === "O";

export function useNoReset() {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;
  const { data: project } = useProjectRetrieveQuery(
    { id: projectIdOrZero },
    { skip: !projectId },
  );
  if (!project) {
    return true;
  }
  return getNoReset(project);
}
