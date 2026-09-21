/**
 * Format a unit symbol for display, appending "/kg" when the variable's unit
 * is per body weight (`variable.unit_per_body_weight`).
 * @param symbol the unit symbol, e.g. "mL/s"
 * @param unitPerBodyWeight whether the unit is per body weight
 * @returns the formatted symbol, e.g. "mL/s/kg", or "" if there is no symbol.
 */
export default function formatUnitSymbol(
  symbol: string | undefined | null,
  unitPerBodyWeight?: boolean | null,
): string {
  if (!symbol) {
    return "";
  }
  return unitPerBodyWeight ? `${symbol}/kg` : symbol;
}
