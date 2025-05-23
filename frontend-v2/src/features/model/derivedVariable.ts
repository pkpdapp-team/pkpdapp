import { DerivedVariable, TypeEnum, VariableRead } from "../../app/backendApi";

export type DerivedVariableType = TypeEnum;

export function derivedIndex(
  type: DerivedVariableType,
  derivedVariables: DerivedVariable[],
  variable: VariableRead,
): number {
  return derivedVariables.findIndex(
    (ro) => ro.pk_variable === variable.id && ro.type === type,
  );
}
