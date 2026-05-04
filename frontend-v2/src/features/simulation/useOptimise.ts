import { useCallback } from "react";

import {
  CombinedModelRead,
  Optimise,
  OptimiseResponse,
  useCombinedModelOptimiseCreateMutation,
} from "../../app/backendApi";

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
  };
}