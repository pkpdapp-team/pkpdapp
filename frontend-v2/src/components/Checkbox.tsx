import React from 'react';
import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form';
import * as material from '@mui/material';

type Props<T extends FieldValues> = {
  label: string;
  name: FieldPath<T>;
  control: Control<T>;
  rules?: Object;
  checkboxFieldProps?: material.CheckboxProps;
};

function Checkbox<T extends FieldValues>({ label, name, control, rules, checkboxFieldProps }: Props<T>): React.ReactElement {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <material.Checkbox
          name={name}
          id={name}
          value={value === undefined ?  false : value}
          onChange={onChange}
          onBlur={onBlur}
          {...checkboxFieldProps}
        />
      )}
    />
  );
};

export default Checkbox;