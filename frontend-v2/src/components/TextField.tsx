import React, { useEffect, useState } from 'react';
import { Control, Controller, FieldPath, FieldValues, useFormState } from 'react-hook-form';
import * as material from '@mui/material';
import { useFieldState } from '../app/hooks';

type Props<T extends FieldValues> = {
  label?: string;
  name: FieldPath<T>;
  control: Control<T>;
  rules?: Object;
  textFieldProps?: material.TextFieldProps;
};

function TextField<T extends FieldValues>({ label, name, control, rules, textFieldProps }: Props<T>): React.ReactElement {
  const [fieldValue, setFieldValue] = useFieldState({ name, control });

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field: { onChange, onBlur, value }, fieldState: { error, isDirty, isTouched } }) => {
        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
          if (e.target.value !== value) {
            onChange(e);
          }
          onBlur();
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          setFieldValue(e.target.value);
        };
        return (
          <material.TextField
            label={ !error ? label : error?.message || (error?.type === 'required' ? 'Required' : '')}
            name={name}
            id={name}
            variant="outlined"
            value={fieldValue || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            error={!!error}
            {...textFieldProps}
          />
        );
      }}
    />
  );
};

export default TextField;