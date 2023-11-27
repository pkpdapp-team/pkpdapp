import React from "react";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import * as material from "@mui/material";

type Props<T extends FieldValues> = {
  label: string;
  name: FieldPath<T>;
  control: Control<T>;
  rules?: Object;
  checkboxFieldProps?: material.CheckboxProps;
};

function Checkbox<T extends FieldValues>({
  label,
  name,
  control,
  rules,
  checkboxFieldProps,
}: Props<T>): React.ReactElement {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({
        field: { onChange, onBlur, value },
        fieldState: { error },
      }) => {
        return (
          <material.FormControlLabel
            control={
              <material.Checkbox
                name={name}
                id={name}
                checked={value === undefined ? false : value}
                onChange={onChange}
                onBlur={onBlur}
                data-cy={`checkbox-${name}`}
                {...checkboxFieldProps}
              />
            }
            label={label}
          />
        );
      }}
    />
  );
}

export default Checkbox;
