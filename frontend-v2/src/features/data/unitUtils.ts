export function normaliseUnitSymbol(symbol: string): string {
  if (!symbol?.replace) {
    return symbol;
  }
  return symbol
    .replace("mm3", "mm³")
    .replace("ug", "µg")
    .replace("uL", "µL")
    .replace("umol", "µmol");
}
