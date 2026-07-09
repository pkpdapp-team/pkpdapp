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
  };
}
