import { BiomarkerTypeRead, VariableRead } from "../../app/backendApi";

export function observationLabel(
  id: number,
  biomarkerTypes: BiomarkerTypeRead[],
  variables: VariableRead[],
): string {
  const biomarkerType = biomarkerTypes.find((b) => b.id === id);
  const variable = variables.find((v) => v.id === biomarkerType?.variable);
  return variable?.description
    ? `${variable.name} (${variable.description})`
    : variable?.name || biomarkerType?.name || String(id);
}
