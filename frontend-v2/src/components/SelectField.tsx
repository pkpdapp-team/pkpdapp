import React from 'react';
import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form';
import { Select, SelectProps, MenuItem } from '@mui/material';

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
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => {
        return (
          <Select
            label={label}
            name={name}
            id={name}
            value={value === undefined ?  '' : value}
            onChange={onChange}
            onBlur={onBlur}
            error={!!error}
            {...selectProps}
          >
            {options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        )
      }}
    />
  );
};

export default SelectField;