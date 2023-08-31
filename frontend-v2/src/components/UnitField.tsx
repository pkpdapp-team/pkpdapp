import React from 'react';
import { Control, FieldPath, FieldValues } from 'react-hook-form';
import { SelectProps } from '@mui/material';
import { Compound, Unit, useUnitRetrieveQuery } from '../app/backendApi';
import SelectField from './SelectField';

type Props<T extends FieldValues> = {
  label: string;
  baseUnit?: Unit;
  name: FieldPath<T>;
  control: Control<T>;
  rules?: Object;
  selectProps?: SelectProps;
  compound?: Compound;
};

function UnitField<T extends FieldValues>({ label, name, baseUnit, control, rules, selectProps }: Props<T>): React.ReactElement {

  const isDimensionless = baseUnit?.symbol === '' || false;
  if (!baseUnit || isDimensionless) {
    selectProps = { ...selectProps, disabled: true };
  }

  const options = baseUnit?.compatible_units ? 
    baseUnit?.compatible_units.map((unit: { [key: string]: string }) => {
      return { value: unit.id, label: unit.symbol } 
    }) : [];

  return (
    <SelectField label={label} name={name} options={options} control={control} rules={rules} selectProps={selectProps} />
  );
};

export default UnitField;