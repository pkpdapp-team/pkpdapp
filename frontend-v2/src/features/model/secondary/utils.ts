import { UnitRead, VariableRead } from "../../../app/backendApi";

type UnitSymbol = {
  symbol?: string;
};

export function getAucVariable(
  variable: VariableRead,
  variables: VariableRead[],
): VariableRead | undefined {
  const [compartmentName, name] = variable.qname.split(".");
  return variables.find(
    (v) => v.qname === `${compartmentName}.calc_${name}_AUC`,
  );
}

export function getCompositeAucUnit(
  timeUnit: UnitSymbol | undefined,
  variable: VariableRead,
  units: UnitRead[],
  concentrationUnitOverride?: UnitSymbol,
): UnitRead | undefined {
  const concentrationUnit =
    concentrationUnitOverride ||
    units.find((unit) => unit.id === (variable.secondary_unit || variable.unit));
  return units.find(
    (unit) => unit.symbol === `${timeUnit?.symbol}*${concentrationUnit?.symbol}`,
  );
}
