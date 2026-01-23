import { useCallback } from "react";
import { useForm, useFormState } from "react-hook-form";

import {
  CombinedModel,
  CombinedModelRead,
  PharmacodynamicRead,
  useCombinedModelSetParamsToDefaultsUpdateMutation,
} from "../../../app/backendApi";
import { ModelFormData, CombinedModelUpdate } from "../Model";
import useDirty from "../../../hooks/useDirty";

export function useModelFormDataCallback({
  model,
  reset,
  updateModel,
  pd_models,
}: {
  model: CombinedModelRead;
  reset: (values?: Partial<ModelFormData>) => void;
  updateModel: CombinedModelUpdate;
  pd_models?: PharmacodynamicRead[];
}) {
  const [setParamsToDefault] =
    useCombinedModelSetParamsToDefaultsUpdateMutation();

  const handleFormData = useCallback(
    async (data: ModelFormData) => {
      if (!model) {
        return;
      }

      // if tlag checkbox is unchecked, then remove tlag derived variables
      if (data.has_lag !== model.has_lag && !data.has_lag) {
        data.derived_variables = data.derived_variables.filter(
          (dv) => dv.type !== "TLG",
        );
      }

      // if pd_model is not a tumour growth model, then clear pd_model2
      const pdModel = pd_models?.find((pm) => pm.id === data.pd_model);
      if (pdModel && pdModel.is_library_model) {
        const isTumourModel = pdModel.model_type === "TG";
        if (!isTumourModel) {
          data.pd_model2 = null;
        }
      }

      // if pd_model is null, then clear pd_model2
      if (!data.pd_model) {
        data.pd_model2 = null;
      }

      // Reset form isDirty and isSubmitting state from previous submissions.
      reset({
        ...data,
      });
      try {
        const response = await updateModel({
          id: model.id,
          combinedModel: data,
        });
        if (response?.data) {
          /* 
              If the pk model has changed
              need to reset the parameters.
            */
          if (
            data.pk_model !== model?.pk_model ||
            data.pk_model2 !== model?.pk_model2
          ) {
            setParamsToDefault({ id: model.id, combinedModel: data });
          }
        }
        return response;
      } catch (error) {
        console.error(error);
        reset({
          ...model,
        });
      }
    },
    [model, updateModel, setParamsToDefault, reset, pd_models],
  );
  return handleFormData;
}

export function useModelFormState({ model }: { model: CombinedModel }) {
  const defaultValues: ModelFormData = {
    ...model,
  };
  const { reset, handleSubmit, control } = useForm<ModelFormData>({
    defaultValues,
    values: defaultValues,
  });
  const { isDirty } = useFormState({
    control,
  });

  useDirty(isDirty);

  return { control, reset, handleSubmit };
}
