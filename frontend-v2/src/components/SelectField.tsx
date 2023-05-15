import React from 'react';
import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form';
import { Select, SelectProps, MenuItem, InputLabel, FormControl, OutlinedInput } from '@mui/material';

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
};

function SelectField<T extends FieldValues>({ label, name, options, control, rules, selectProps }: Props<T>): React.ReactElement {
  const labelId = `${name}-label`;
  const displayEmpty = selectProps?.displayEmpty || true;
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <FormControl fullWidth>
          <InputLabel id={labelId} shrink={displayEmpty}>{label}</InputLabel>
          <Select
            labelId={labelId}
            name={name}
            id={name}
            value={value === undefined ? '' : value}
            onChange={onChange}
            onBlur={onBlur}
            input={<OutlinedInput label={label} notched={displayEmpty} />}
            error={!!error}
            {...selectProps}
          >
            {options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    />
  );
};

export default SelectField;