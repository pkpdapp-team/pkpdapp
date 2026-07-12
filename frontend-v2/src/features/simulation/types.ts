/**
 * The "central series" shape used by the plotting, export and results code: one flat
 * array of values per output variable. The backend `simulate` endpoint returns the
 * richer uncertainty shape (`SimulateResponse` in backendApi, with mean/std/quantiles
 * per output), which we reduce to this shape by taking the median (P50) — the central
 * value for a population run, and simply the value for a deterministic run — while
 * keeping the full `SimulateResponse` for the P5-P95 uncertainty bands.
 */
export type CentralSimulateResponse = {
  time: number[];
  group?: number | null;
  outputs: {
    [id: string]: number[];
  };
};
