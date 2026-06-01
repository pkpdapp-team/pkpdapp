import { useCallback } from "react";
import { useForm, useFormState } from "react-hook-form";

import {
  CombinedModelRead,
  ProjectRead,
  ProjectSpeciesEnum,
  UnitListApiResponse,
  useCombinedModelSetParamsToDefaultsUpdateMutation,
  useProjectUpdateMutation,
} from "../../app/backendApi";
import useDirty from "../../hooks/useDirty";

const defaultSpeciesWeights = new Map([
  ["H", 75.0],
  ["R", 0.25],
  ["K", 3.5],
  ["M", 0.025],
  ["O", 10.0],
]);

export function useProjectFormDataCallback({
  model,
  project,
  reset,
  units,
}: {
  model: CombinedModelRead;
  project: ProjectRead;
  reset: (values?: Partial<ProjectFormData>) => void;
  units: UnitListApiResponse;
}) {
  const [updateProject] = useProjectUpdateMutation();
  const [setParamsToDefault] =
    useCombinedModelSetParamsToDefaultsUpdateMutation();
  const handleFormData = useCallback(
    async (data: ProjectFormData) => {
      if (!project) {
        return;
      }
      const { species, pk_tags, pd_tags } = data;
      let species_weight = data.species_weight;
      let species_weight_unit = data.species_weight_unit;

      if (species !== project.species) {
        // if species has changed, then set default values for body weight and unit
        const kg = units.find((u) => u.symbol === "kg");
        if (kg && species) {
          species_weight_unit = kg.id;
          species_weight = defaultSpeciesWeights.get(species);
        }
      }

      // Reset form isDirty and isSubmitting state from previous submissions.
      reset({
        ...data,
        species_weight,
        species_weight_unit,
      });
      try {
        const response = await updateProject({
          id: project.id,
          project: {
            ...project,
            species,
            species_weight,
            species_weight_unit,
            pk_tags,
            pd_tags,
          },
        });
        if (species !== project.species) {
          /* 
            If the species has changed, reset the model parameters.
          */
          setParamsToDefault({ id: model.id, combinedModel: { ...model } });
        }
        return response;
      } catch (error) {
        console.error(error);
        reset({
          species: project.species,
          species_weight: project.species_weight,
          species_weight_unit: project.species_weight_unit,
          pk_tags: project.pk_tags || [],
          pd_tags: project.pd_tags || [],
        });
      }
    },
    [project, reset, updateProject, units, setParamsToDefault, model],
  );
  return handleFormData;
}

export function useProjectFormState({ project }: { project: ProjectRead }) {
  const species = project.species;
  const species_weight = project.species_weight;
  const species_weight_unit = project.species_weight_unit;
  const pk_tags = project.pk_tags || [];
  const pd_tags = project.pd_tags || [];
  const defaultValues: ProjectFormData = {
    species,
    species_weight,
    species_weight_unit,
    pk_tags,
    pd_tags,
  };
  const { reset, handleSubmit, control } = useForm<ProjectFormData>({
    defaultValues,
    values: defaultValues,
  });
  const { isDirty } = useFormState({
    control,
  });

  useDirty(isDirty);

  return { control, reset, handleSubmit };
}
export type ProjectFormData = {
  species: ProjectSpeciesEnum | undefined;
  species_weight: number | undefined;
  species_weight_unit: number | undefined;
  pk_tags: number[];
  pd_tags: number[];
};
