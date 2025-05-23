import { ChangeEvent, FocusEvent, ReactElement } from "react";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import { TextField, TextFieldProps } from "@mui/material";
import { useFieldState } from "../app/hooks";
import { getLabel } from "../shared/getRequiredLabel";

type Props<T extends FieldValues> = {
  label?: string;
  name: FieldPath<T>;
  control: Control<T>;
  rules?: Record<string, unknown>;
  textFieldProps?: TextFieldProps;
  size?: "small" | "medium";
  data_cy?: string;
  sx?: Record<string, string>;
};

function convert(value: string): number | null {
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
  size = "medium",
  sx,
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
            size={size}
            label={
              !error
                ? getLabel(label || "", Boolean(rules?.required))
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
