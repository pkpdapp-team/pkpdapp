export function normaliseUnitSymbol(symbol: string): string {
  return symbol.replace("mm3", "mm³").replace("ug", "µg").replace("uL", "µL").replace("umol", "µmol");
}