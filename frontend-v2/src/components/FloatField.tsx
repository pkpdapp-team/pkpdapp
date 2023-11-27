import React from "react";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import * as material from "@mui/material";
import { useFieldState } from "../app/hooks";

type Props<T extends FieldValues> = {
  label?: string;
  name: FieldPath<T>;
  control: Control<T>;
  rules?: Object;
  textFieldProps?: material.TextFieldProps;
  data_cy?: string;
};

function convert(value: any) {
  if (typeof value === "string") {
    if (value !== "") {
      return parseFloat(value);
    } else {
      return null;
    }
  } else {
    return null;
  }
}

function FloatField<T extends FieldValues>({
  label,
  name,
  control,
  rules,
  textFieldProps,
  data_cy,
}: Props<T>): React.ReactElement {
  const [fieldValue, setFieldValue] = useFieldState({ name, control });
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({
        field: { onChange, onBlur, value },
        fieldState: { error, isDirty, isTouched },
      }) => {
        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
          const updatedValue = convert(e.target.value);
          console.log("handleBlur", updatedValue, value);
          if (updatedValue !== value) {
            e.target.value = updatedValue as any;
            onChange(e);
          }
          onBlur();
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          console.log("handleChage", convert(e.target.value));
          setFieldValue(convert(e.target.value));
        };
        return (
          <material.TextField
            label={
              !error
                ? label
                : error?.message ||
                  (error?.type === "required" ? "Required" : "")
            }
            name={name}
            id={name}
            variant="outlined"
            value={
              fieldValue === undefined || fieldValue === null ? "" : fieldValue
            }
            onChange={handleChange}
            data-cy={data_cy || `float-field-${name}`}
            onBlur={handleBlur}
            error={!!error}
            {...textFieldProps}
            type="number"
          />
        );
      }}
    />
  );
}

export default FloatField;
