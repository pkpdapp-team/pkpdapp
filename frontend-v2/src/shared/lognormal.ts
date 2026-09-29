// Conversions between the user-facing (arithmetic mean, standard deviation) of a
// log-normal quantity and its internal representation (median, log-space
// variance). Users enter the arithmetic mean M and standard deviation S of the
// actual (non-log) quantity, which are more intuitive than the log-space
// parameters.
//
// A log-normal with log-space parameters mu = ln(median) and variance has:
//   M = median * exp(variance / 2)
//   S = M * sqrt(exp(variance) - 1)
// so, with cv2 = (S / M)^2:
//   variance = ln(1 + cv2)
//   median   = M / sqrt(1 + cv2)
//
// S = 0 collapses to a point mass at median = M (variance 0).

export function meanStdToMedianVariance(
  mean: number,
  std: number,
): { median: number; variance: number } {
  const cv2 = (std / mean) ** 2;
  return {
    median: mean / Math.sqrt(1 + cv2),
    variance: Math.log1p(cv2),
  };
}

export function medianVarianceToMeanStd(
  median: number,
  variance: number,
): { mean: number; std: number } {
  const mean = median * Math.exp(variance / 2);
  return {
    mean,
    std: mean * Math.sqrt(Math.expm1(variance)),
  };
}
