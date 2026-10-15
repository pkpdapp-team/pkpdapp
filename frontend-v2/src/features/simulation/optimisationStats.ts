export function isNearBound(optimal: number, lower: number, upper: number): boolean {
  const range = upper - lower;
  if (range === 0) return false;
  const frac = (optimal - lower) / range;
  return frac < 0.001 || frac > 0.999;
}

export function standardErrors(covariance: number[][]): number[] {
  return covariance.map((row, i) => Math.sqrt(Math.max(0, row[i])));
}

export function percentRse(se: number, optimal: number): number {
  return optimal !== 0 ? (100 * se) / Math.abs(optimal) : NaN;
}

export function correlation(covariance: number, seI: number, seJ: number): number {
  const denom = seI * seJ;
  return denom > 0 ? covariance / denom : NaN;
}
