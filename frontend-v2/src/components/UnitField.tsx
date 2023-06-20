import React from 'react';
import { Control, FieldPath, FieldValues } from 'react-hook-form';
import { SelectProps } from '@mui/material';
import { useUnitRetrieveQuery } from '../app/backendApi';
import SelectField from './SelectField';

type Props<T extends FieldValues> = {
  label: string;
  baseUnitId?: number;
  name: FieldPath<T>;
  control: Control<T>;
  rules?: Object;
  selectProps?: SelectProps;
};

function UnitField<T extends FieldValues>({ label, name, baseUnitId, control, rules, selectProps }: Props<T>): React.ReactElement {
  const { data: baseUnit, isLoading } = useUnitRetrieveQuery({id: baseUnitId || 0}, { skip: !baseUnitId });

  if (isLoading) {
    return <div>Loading...</div>;
  }

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