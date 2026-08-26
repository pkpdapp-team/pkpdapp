import { useCallback, useState } from "react";

import {
  CombinedModelRead,
  Optimise,
  OptimiseResponse,
  useCombinedModelOptimiseCreateMutation,
} from "../../app/backendApi";

export type NoiseModel = "additive" | "multiplicative" | "combined";

export const DEFAULT_OPTIMISE_METHOD = "pso";
export const DEFAULT_NOISE_MODEL: NoiseModel = "multiplicative";
export const DEFAULT_MAX_ITERATIONS = "1000";

interface ErrorObject {
  error: string;
}

function getErrorObject(errorBase: unknown): ErrorObject | undefined {
  if (!errorBase || typeof errorBase !== "object") {
    return undefined;
  }

  if (
    "data" in errorBase &&
    errorBase.data &&
    typeof errorBase.data === "object" &&
    "error" in errorBase.data
  ) {
    return errorBase.data as ErrorObject;
  }

  return { error: "Unknown error" };
}

export default function useOptimise(model: CombinedModelRead | undefined) {
  const [optimise, { data, error: optimiseErrorBase, isLoading }] =
    useCombinedModelOptimiseCreateMutation();

  // Optimisation settings shared by the sidebar Fit button and the
  // OptimisationSettings dialog. Kept here so they persist for the lifetime of
  // the Simulations page (across dialog open/close) rather than resetting each
  // time the dialog mounts.
  const [method, setMethod] = useState<string>(DEFAULT_OPTIMISE_METHOD);
  const [noiseModel, setNoiseModel] = useState<NoiseModel>(DEFAULT_NOISE_MODEL);
  const [maxIterations, setMaxIterations] = useState<string>(
    DEFAULT_MAX_ITERATIONS,
  );
  // Per-variable "optimise in log space" selections from the OptimisationSettings
  // dialog. Sparse override maps keyed by model variable id: an absent entry
  // falls back to the dialog's computed default, a present entry is the user's
  // explicit choice. Kept here (rather than in the dialog) so the selections
  // survive the dialog closing/reopening, like method / maxIterations above.
  const [paramUseLogSpace, setParamUseLogSpace] = useState<
    Record<number, boolean>
  >({});
  const [sigmaUseLogSpace, setSigmaUseLogSpace] = useState<
    Record<number, boolean>
  >({});
  const [sigmaMultUseLogSpace, setSigmaMultUseLogSpace] = useState<
    Record<number, boolean>
  >({});
  // Per-output-variable sigma start / bounds and noise model from the
  // OptimisationSettings dialog. Sparse override maps keyed by model output
  // variable id: an absent entry falls back to the data-derived default, a
  // present entry is the user's explicit choice. Kept here so they survive the
  // dialog closing/reopening and are honoured by the sidebar Fit button.
  const [sigmaStartByVar, setSigmaStartByVar] = useState<
    Record<number, number>
  >({});
  const [sigmaBoundsByVar, setSigmaBoundsByVar] = useState<
    Record<number, [number, number]>
  >({});
  const [sigmaMultStartByVar, setSigmaMultStartByVar] = useState<
    Record<number, number>
  >({});
  const [sigmaBoundsMultByVar, setSigmaBoundsMultByVar] = useState<
    Record<number, [number, number]>
  >({});
  const [noiseModelByVar, setNoiseModelByVar] = useState<
    Record<number, NoiseModel>
  >({});

  const optimiseModel = useCallback(
    async (optimiseInputs: Optimise) => {
      if (!model) {
        return { error: { error: "Model not found" } };
      }

      const response = await optimise({
        id: model.id,
        optimise: optimiseInputs,
      });

      if ("data" in response) {
        return {
          data: response.data as OptimiseResponse,
        };
      }

      return {
        error: getErrorObject(response.error),
      };
    },
    [model, optimise],
  );

  return {
    optimiseModel,
    loadingOptimise: isLoading,
    data,
    error: getErrorObject(optimiseErrorBase),
    method,
    setMethod,
    noiseModel,
    setNoiseModel,
    maxIterations,
    setMaxIterations,
    paramUseLogSpace,
    setParamUseLogSpace,
    sigmaUseLogSpace,
    setSigmaUseLogSpace,
    sigmaMultUseLogSpace,
    setSigmaMultUseLogSpace,
    sigmaStartByVar,
    setSigmaStartByVar,
    sigmaBoundsByVar,
    setSigmaBoundsByVar,
    sigmaMultStartByVar,
    setSigmaMultStartByVar,
    sigmaBoundsMultByVar,
    setSigmaBoundsMultByVar,
    noiseModelByVar,
    setNoiseModelByVar,
  };
}
