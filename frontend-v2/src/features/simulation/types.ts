/**
 * The "mean series" shape used by the plotting and export code: one flat array of
 * values per output variable. The backend `simulate` endpoint now returns the richer
 * uncertainty shape (`SimulateResponse` in backendApi, with mean/std/quantiles per
 * output), which we reduce to this shape (extracting the mean) for the mean lines,
 * while keeping the full `SimulateResponse` for the uncertainty bands.
 */
export type MeanSimulateResponse = {
  time: number[];
  group?: number | null;
  outputs: {
    [id: string]: number[];
  };
};
