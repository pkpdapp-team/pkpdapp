import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "./store";
import { Control, FieldPath, FieldValues, useFormState } from "react-hook-form";
import { useEffect, useState } from "react";

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
};

export function useFieldState<T extends FieldValues>({
  name,
  control,
}: Props<T>) {
  const { defaultValues } = useFormState({ control, name });
  const keys = name.split(".");
  const defaultValue = keys.reduce((acc, key) => {
    if (acc && typeof acc === "object") {
      return acc[key];
    }
    return undefined;
  }, defaultValues);

  const [fieldValue, setFieldValue] = useState<any>(defaultValue);

  useEffect(() => {
    setFieldValue(defaultValue);
  }, [defaultValue]);

  return [fieldValue, setFieldValue];
}
