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
  // hide the internal covariate machinery (the sampled covariate value inputs
  // and their centring medians) but keep the editable coefficients. Coefficients
  // are named "<param>_a_<cov>" (continuous exponent) or "<param>_d_<cov>_<k>"
  // (categorical delta); the inputs ("WT"/"AGE"/"SEX"/"COV_<id>") and medians
  // ("mu_<cov>") never contain "_a_"/"_d_".
  constVariables = constVariables.filter(
    (variable) =>
      !variable.qname.startsWith("Covariates.") ||
      variable.name.includes("_a_") ||
      variable.name.includes("_d_"),
  );
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
  // A covariate coefficient ("<param>_a_<cov>" / "<param>_d_<cov>_<k>") is sorted
  // directly after its parent parameter rather than by its own name. Resolve the
  // parent by the longest parameter name that prefixes the coefficient name
  // (parameter names may themselves contain underscores).
  const paramNames = constVariables
    .filter((v) => !v.qname.startsWith("Covariates."))
    .map((v) => v.name)
    .sort((a, b) => b.length - a.length);
  const parentNameFor = (variable: VariableRead): string => {
    if (variable.qname.startsWith("Covariates.")) {
      const parent = paramNames.find(
        (name) =>
          variable.name.startsWith(`${name}_a_`) ||
          variable.name.startsWith(`${name}_d_`),
      );
      if (parent) {
        return parent;
      }
    }
    return variable.name;
  };
  // sort key: parent's priority, then parent name (groups a parent with its
  // coefficients), then the parent before its coefficients, then coefficient name
  const sortKey = (variable: VariableRead) => {
    const parentName = parentNameFor(variable);
    const isCoefficient = parentName !== variable.name;
    const parent = isCoefficient
      ? constVariables.find((v) => v.name === parentName) ?? variable
      : variable;
    return {
      priority: paramPriority(parent),
      parentName,
      isCoefficient: isCoefficient ? 1 : 0,
      name: variable.name,
    };
  };
  constVariables.sort((a, b) => {
    const ka = sortKey(a);
    const kb = sortKey(b);
    return (
      ka.priority - kb.priority ||
      ka.parentName.localeCompare(kb.parentName) ||
      ka.isCoefficient - kb.isCoefficient ||
      ka.name.localeCompare(kb.name)
    );
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
    { dosedPkModelId: model?.id || 0 },
    { skip: !model?.id },
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
