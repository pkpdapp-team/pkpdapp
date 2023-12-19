import React from "react";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import * as material from "@mui/material";
import { useFieldState } from "../app/hooks";
import { getLabel } from "../shared/getRequiredLabel";

type Props<T extends FieldValues> = {
  label?: string;
  name: FieldPath<T>;
  control: Control<T>;
  rules?: Record<string, unknown>;
  textFieldProps?: material.TextFieldProps;
  data_cy?: string;
  sx?: Record<string, string>
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
  sx
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
          if (updatedValue !== value) {
            e.target.value = updatedValue as any;
            onChange(e);
          }
          onBlur();
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          setFieldValue(convert(e.target.value));
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
            sx={sx}
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
