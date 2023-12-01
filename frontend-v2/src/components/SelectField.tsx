import React from "react";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import {
  Select,
  SelectProps,
  MenuItem,
  InputLabel,
  FormControl,
  OutlinedInput,
  FormControlProps,
} from "@mui/material";

type Option = {
  value: any;
  label: string;
};

type Props<T extends FieldValues> = {
  label?: string;
  name: FieldPath<T>;
  options: Option[];
  control: Control<T>;
  rules?: Object;
  selectProps?: SelectProps;
  formControlProps?: FormControlProps;
};

function SelectField<T extends FieldValues>({
  label,
  name,
  options,
  control,
  rules,
  selectProps,
  formControlProps,
}: Props<T>): React.ReactElement {
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
        <FormControl {...formControlProps} style={{ minWidth: labelWidth }}>
          <InputLabel id={labelId} shrink={displayEmpty}>
            {label}
          </InputLabel>
          <Select
            labelId={labelId}
            name={name}
            id={name}
            value={value === undefined || value === null ? "" : value}
            // @ts-ignore
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
