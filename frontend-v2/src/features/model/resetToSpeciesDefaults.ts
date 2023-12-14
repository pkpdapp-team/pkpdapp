import { MutationTrigger } from "@reduxjs/toolkit/dist/query/react/buildHooks";
import {
  CombinedModelRead,
  CompoundRead,
  PharmacokineticRead,
  ProjectRead,
  UnitRead,
  VariableRead,
  VariableUpdateApiArg,
} from "../../app/backendApi";
import paramPriority from "./paramPriority";
import { param_default as paramDefaults } from "./param_default";
import {
  MutationDefinition,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  FetchBaseQueryMeta,
} from "@reduxjs/toolkit/dist/query";

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

type VariableMutation = MutationTrigger<
  MutationDefinition<
    VariableUpdateApiArg,
    BaseQueryFn<
      string | FetchArgs,
      unknown,
      FetchBaseQueryError,
      {},
      FetchBaseQueryMeta
    >,
    never,
    VariableRead,
    "api"
  >
>;

export function resetToSpeciesDefaults(
  pkModel: PharmacokineticRead,
  project: ProjectRead,
  compound: CompoundRead,
  constVariables: VariableRead[],
  units: UnitRead[],
  updateVariable: VariableMutation,
) {
  if (getNoReset(project) || !project.species) {
    return;
  }
  const modelName: string = pkModel.name
    .replace("_clinical", "")
    .replace("_preclinical", "")
    .replace("tmdd_full_constant_target", "tmdd")
    .replace("tmdd_QSS_constant_target", "tmdd")
    .replace("tmdd_full", "tmdd")
    .replace("tmdd_QSS", "tmdd")
    .replace("production", "")
    .replace("elimination", "");
  const species: string = project.species;
  const compoundType: string = compound.compound_type || "SM";
  for (const variable of constVariables) {
    const varName = variable.name;
    const defaultVal =
      paramDefaults[modelName]?.[varName]?.[species]?.[compoundType];
    if (defaultVal?.unit === "dimensionless") {
      defaultVal.unit = "";
    }
    let defaultUnitId: number | undefined = defaultVal
      ? units.find((unit) => unit.symbol === defaultVal.unit)?.id
      : undefined;
    let defaultValue: number | undefined = defaultVal?.value;
    if (varName.endsWith("_RO_KD")) {
      defaultValue = compound.dissociation_constant || undefined;
      defaultUnitId = compound.dissociation_unit;
    } else if (varName.endsWith("_RO_TC")) {
      defaultValue = compound.target_concentration || undefined;
      defaultUnitId = compound.target_concentration_unit;
    }
    if (!defaultValue || !defaultUnitId) {
      continue;
    }
    if (defaultUnitId) {
      updateVariable({
        id: variable.id,
        variable: {
          ...variable,
          default_value: defaultValue,
          unit: defaultUnitId,
        },
      });
    }
  }
}
