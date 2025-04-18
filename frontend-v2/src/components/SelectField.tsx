import { ReactElement } from "react";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import {
  Select,
  SelectProps,
  MenuItem,
  InputLabel,
  FormControl,
  OutlinedInput,
  FormControlProps,
  SxProps,
} from "@mui/material";
import { getLabel } from "../shared/getRequiredLabel";

type Option = {
  value: string | number;
  label: string;
};

type Props<T extends FieldValues> = {
  label?: string;
  name: FieldPath<T>;
  options: Option[];
  control: Control<T>;
  rules?: Record<string, unknown>;
  selectProps?: SelectProps;
  formControlProps?: FormControlProps;
  size?: "small" | "medium";
  sx?: SxProps;
};

function SelectField<T extends FieldValues>({
  label,
  name,
  options,
  control,
  rules,
  selectProps,
  formControlProps,
  size = "medium",
  sx,
}: Props<T>): ReactElement {
  const labelId = `${name}-label`;
  const displayEmpty = selectProps?.displayEmpty || true;
  const pixelPerChar = 9;
  const labelWidth = (label ? label.length : 0) * pixelPerChar;

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({
        field: { onChange, onBlur, value },
        fieldState: { error },
      }) => (
        <FormControl
          sx={sx}
          {...formControlProps}
          style={{ minWidth: labelWidth }}
        >
          <InputLabel id={labelId} shrink={displayEmpty}>
            {getLabel(label || "", Boolean(rules?.required))}
          </InputLabel>
          <Select
            sx={sx}
            size={size}
            labelId={labelId}
            name={name}
            id={name}
            value={value === undefined || value === null ? "" : value}
            onChange={onChange}
            onBlur={onBlur}
            input={<OutlinedInput label={label} notched={displayEmpty} />}
            error={!!error}
            data-cy={`select-${name}`}
            {...selectProps}
          >
            {options.map((option) => (
              <MenuItem
                key={option.value}
                value={option.value}
                data-cy={`select-option-${name}-${option.label}`}
              >
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    />
  );
}

export default SelectField;
