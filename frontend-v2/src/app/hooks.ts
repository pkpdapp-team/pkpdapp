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
  defaultValue?: string | number;
};

/**
 * Subscribe to the stored default value for a given path within a form control object.
 * @param props.control A form control object.
 * @param props.name Path of a field within the control object.
 * @returns Default value for name.
 */
export function useDefaultValue<T extends FieldValues>({
  control,
  name,
}: Props<T>) {
  const { defaultValues } = useFormState({ control, name });
  const keys = name.split(".");
  let nextValue = defaultValues;
  keys.forEach((key) => {
    if (typeof nextValue === "object") {
      nextValue = nextValue[key];
    }
  });
  return nextValue as string | number | undefined;
}

export function useFieldState<T extends FieldValues>({
  name,
  control,
  defaultValue,
}: Props<T>) {
  const defaultFromFormKey = useDefaultValue({ control, name });
  const initialValue = defaultValue
    ? defaultFromFormKey || defaultValue
    : defaultFromFormKey;

  const [fieldValue, setFieldValue] = useState<any>(initialValue);

  useEffect(() => {
    if (fieldValue !== initialValue) {
      setFieldValue(initialValue);
    }
  }, [initialValue]);

  return [fieldValue, setFieldValue];
}
