import { Control, useFieldArray, useForm } from "react-hook-form";
import {
  CompoundRead,
  ProjectRead,
  UnitRead,
  useVariableUpdateMutation,
  Variable,
  VariableRead,
} from "../../app/backendApi";
import { FormData } from "./Model";
import { useEffect } from "react";
import useDirty from "../../hooks/useDirty";
import useEditProtocol from "./useEditProtocol";

export function useFormData({ control }: { control: Control<FormData> }) {
  const {
    fields: mappings,
    append: appendMapping,
    remove: removeMapping,
  } = useFieldArray({
    control,
    name: "model.mappings",
  });
  const {
    fields: derivedVariables,
    append: derivedVariablesAppend,
    remove: derivedVariablesRemove,
  } = useFieldArray({
    control,
    name: "model.derived_variables",
  });
  return {
    mappings,
    appendMapping,
    removeMapping,
    derivedVariables,
    derivedVariablesAppend,
    derivedVariablesRemove,
  };
}

export function useVariableFormState({
  compound,
  project,
  timeVariable,
  units,
  variable,
}: {
  compound: CompoundRead;
  project: ProjectRead;
  timeVariable: VariableRead | undefined;
  units: UnitRead[];
  variable: VariableRead;
}) {
  const {
    handleSubmit,
    reset,
    formState: { isDirty: isDirtyForm },
    setValue,
    watch,
  } = useForm<Variable>({ defaultValues: variable || { id: 0, name: "" } });
  const watchProtocolId = watch("protocol");
  const isDirty = watchProtocolId !== variable?.protocol || isDirtyForm;
  useDirty(isDirty);
  const [updateVariable] = useVariableUpdateMutation();
  const { addProtocol, removeProtocol, hasProtocol } = useEditProtocol({
    compound,
    project,
    units,
    timeVariable,
    variable,
    watchProtocolId,
  });

  useEffect(() => {
    reset(variable);
  }, [variable, reset]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isDirty) {
        handleSubmit((data) => {
          // @ts-expect-error - lower_bound and upper_bound can be null
          if (data.lower_bound === "") {
            data.lower_bound = null;
          }
          // @ts-expect-error - lower_bound and upper_bound can be null
          if (data.upper_bound === "") {
            data.upper_bound = null;
          }
          updateVariable({ id: variable.id, variable: data });
        })();
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [handleSubmit, isDirty, updateVariable, variable.id]);

  return {
    handleSubmit,
    isDirty,
    updateVariable,
    setValue,
    addProtocol,
    removeProtocol,
    hasProtocol,
  };
}
