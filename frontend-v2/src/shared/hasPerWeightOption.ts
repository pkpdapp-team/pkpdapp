import { UnitRead, VariableRead } from "../app/backendApi";

/**
 * PK variables with volume units (m³) and variables named "Ref_D*" or "D50"
 * can have a per body weight option (`variable.unit_per_body_weight`).
 * @param unit
 * @param variable
 * @returns boolean true if the variable can have a per body weight option.
 */
export function hasPerWeightOption(
  unit?: UnitRead,
  variable?: VariableRead,
): boolean {
  if (!unit || !variable) {
    return false;
  }
  const isPK =
    variable.qname.startsWith("PK") || variable.qname.startsWith("Extra");
  const isPKandVol = isPK && unit?.m === 3;
  const is_Ref_D_or_D50 =
    variable.name.startsWith("Ref_D") || variable.name.startsWith("D50");
  return isPKandVol || is_Ref_D_or_D50;
}
