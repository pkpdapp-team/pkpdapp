import { Control, useFieldArray, useForm } from "react-hook-form";
import {
  CompoundRead,
  ProjectRead,
  UnitRead,
  useVariableRetrieveQuery,
  useVariableUpdateMutation,
  Variable,
  VariableRead,
} from "../../../app/backendApi";
import { FormData } from "../Model";
import { useEffect } from "react";
import useDirty from "../../../hooks/useDirty";
import useEditProtocol from "./useEditProtocol";

export function useFormData({ control }: { control: Control<FormData> }) {
  const {
    fields: mappings,
    append: mappingsAppend,
    remove: mappingsRemove,
  } = useFieldArray({
    control,
    name: "mappings",
  });
  const {
    fields: derivedVariables,
    append: derivedVariablesAppend,
    remove: derivedVariablesRemove,
  } = useFieldArray({
    control,
    name: "derived_variables",
  });
  return {
    mappings,
    mappingsAppend,
    mappingsRemove,
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
  variable_from_list,
}: {
  compound: CompoundRead;
  project: ProjectRead;
  timeVariable: VariableRead | undefined;
  units: UnitRead[];
  variable_from_list: VariableRead;
}) {
  const { data: variable_read } = useVariableRetrieveQuery({ id: variable_from_list.id });
  const variable = variable_read || variable_from_list;
  const {
    handleSubmit,
    formState: { isDirty: isDirtyVariable, submitCount },
    setValue,
    watch,
    reset,
  } = useForm<Variable>({
    defaultValues: variable || { name: "" },
    values: variable,
  });
  const watchProtocolId = variable.protocol;
  const isDirty = watchProtocolId !== variable?.protocol || isDirtyVariable;
  useDirty(isDirty);
  const [updateVariable] = useVariableUpdateMutation();
  const { addProtocol, removeProtocol, hasProtocol, updateProtocol } = useEditProtocol({
    compound,
    project,
    units,
    timeVariable,
    "variable": variable || { id: 0, qname: "", name: "" },
    watchProtocolId,
  });


  useEffect(() => {
    reset(variable_read);
  }, [reset, variable_read]);

  return {
    handleSubmit,
    isDirty,
    updateVariable,
    setValue,
    addProtocol,
    removeProtocol,
    hasProtocol,
    updateProtocol,
  };
}
