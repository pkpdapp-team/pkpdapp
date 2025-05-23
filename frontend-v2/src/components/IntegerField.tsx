import { ChangeEvent, FocusEvent, ReactElement } from "react";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import { TextField, TextFieldProps } from "@mui/material";
import { useFieldState } from "../app/hooks";

type Props<T extends FieldValues> = {
  label?: string;
  name: FieldPath<T>;
  control: Control<T>;
  size?: "small" | "medium";
  rules?: Record<string, unknown>;
  textFieldProps?: TextFieldProps;
};

function convert(value: string): number | string {
  if (typeof value === "string" && value !== "") {
    return parseInt(value);
  } else {
    return value;
  }
}

function IntegerField<T extends FieldValues>({
  label,
  name,
  control,
  rules,
  size = "medium",
  textFieldProps,
}: Props<T>): ReactElement {
  const [fieldValue, setFieldValue] = useFieldState({ name, control });
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({
        field: { onChange, onBlur, value },
        fieldState: { error },
      }) => {
        const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
          const updatedValue = convert(e.target.value);
          if (updatedValue !== value) {
            onChange({ target: { value: updatedValue } });
          }
          onBlur();
        };

        const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
          setFieldValue(convert(e.target.value));
        };
        return (
          <TextField
            label={
              !error
                ? label
                : error?.message ||
                  (error?.type === "required" ? "Required" : "")
            }
            name={name}
            size={size}
            id={name}
            variant="outlined"
            value={
              fieldValue === undefined || fieldValue === null ? "" : fieldValue
            }
            onChange={handleChange}
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

export default IntegerField;
