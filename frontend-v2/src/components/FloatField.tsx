import React from 'react';
import { Control, Controller, FieldPath, FieldValues } from 'react-hook-form';
import * as material from '@mui/material';

type Props<T extends FieldValues> = {
  label?: string;
  name: FieldPath<T>;
  control: Control<T>;
  rules?: Object;
  textFieldProps?: material.TextFieldProps;
};

function FloatField<T extends FieldValues>({ label, name, control, rules, textFieldProps }: Props<T>): React.ReactElement {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field: { onChange, onBlur, value }, fieldState: { error, isDirty, isTouched } }) => {
        return (
          <material.TextField
            label={label}
            name={name}
            id={name}
            variant="outlined"
            value={value === undefined ? '' : value}
            onChange={(e) => { 
              const value = parseFloat(e.target.value)
              return onChange(value)
            }}
            onBlur={onBlur}
            error={!!error}
            helperText={error?.message}
            {...textFieldProps}
            type='number'
          />
        );
      }}
    />
  );
};

export default FloatField;
