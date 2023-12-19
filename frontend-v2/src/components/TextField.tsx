import React from "react";
import {
  Control,
  Controller,
  FieldPath,
  FieldValues
} from "react-hook-form";
import * as material from "@mui/material";
import { useFieldState } from "../app/hooks";
import { getLabel } from "../shared/getRequiredLabel";

type Props<T extends FieldValues> = {
  label?: string;
  name: FieldPath<T>;
  control: Control<T>;
  rules?: Record<string, unknown>;
  mode?: "onChange" | "onBlur";
  textFieldProps?: material.TextFieldProps;
  sx?: material.SxProps
};

function TextField<T extends FieldValues>({
  label,
  name,
  control,
  rules,
  mode,
  textFieldProps,
  sx
}: Props<T>): React.ReactElement {
  const [fieldValue, setFieldValue] = useFieldState({ name, control });

  if (mode === undefined) {
    mode = "onBlur";
  }

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
          if (mode === "onBlur" && e.target.value !== value) {
            onChange(e);
          }
          onBlur();
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          setFieldValue(e.target.value);
          if (mode === "onChange") {
            onChange(e);
          }
        };
        return (
          <material.TextField
            label={
              !error
                ? getLabel(label || '', Boolean(rules?.required))
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
            onBlur={handleBlur}
            error={!!error}
            sx={sx}
            {...textFieldProps}
          />
        );
      }}
    />
  );
}

export default TextField;
