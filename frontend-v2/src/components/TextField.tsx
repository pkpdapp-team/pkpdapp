import { ChangeEvent, FocusEvent, ReactElement } from "react";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import {
  SxProps,
  TextField as MaterialTextField,
  TextFieldProps,
} from "@mui/material";
import { useFieldState } from "../app/hooks";
import { getLabel } from "../shared/getRequiredLabel";

type Props<T extends FieldValues> = {
  label?: string;
  name: FieldPath<T>;
  control: Control<T>;
  rules?: Record<string, unknown>;
  mode?: "onChange" | "onBlur";
  textFieldProps?: TextFieldProps;
  autoShrink?: boolean;
  size?: "small" | "medium";
  sx?: SxProps;
  defaultValue?: string;
};

function TextField<T extends FieldValues>({
  label,
  name,
  control,
  rules,
  mode = "onBlur",
  size = "medium",
  textFieldProps,
  autoShrink,
  sx,
  defaultValue = "",
}: Props<T>): ReactElement {
  const [fieldValue, setFieldValue] = useFieldState({
    name,
    control,
    defaultValue,
  });

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
          // Save an empty string in place of the default value.
          const newValue =
            e.target.value === defaultValue ? "" : e.target.value;
          if (mode === "onBlur" && newValue !== value) {
            onChange({ target: { value: newValue } });
          }
          onBlur();
        };

        const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
          setFieldValue(e.target.value);
          if (mode === "onChange") {
            onChange(e);
          }
        };
        return (
          <MaterialTextField
            size={size}
            label={
              !error
                ? getLabel(label || "", Boolean(rules?.required))
                : error?.message ||
                  (error?.type === "required" ? "Required" : "")
            }
            name={name}
            id={name}
            InputLabelProps={
              autoShrink !== undefined ? { shrink: autoShrink } : {}
            }
            variant="outlined"
            value={fieldValue}
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
