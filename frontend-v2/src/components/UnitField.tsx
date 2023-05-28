import React from 'react';
import { Control, FieldPath, FieldValues } from 'react-hook-form';
import { SelectProps } from '@mui/material';
import { useUnitRetrieveQuery } from '../app/backendApi';
import SelectField from './SelectField';

type Props<T extends FieldValues> = {
  label: string;
  baseUnitId: number | undefined;
  name: FieldPath<T>;
  control: Control<T>;
  rules?: Object;
  selectProps?: SelectProps;
};

function UnitField<T extends FieldValues>({ label, name, baseUnitId, control, rules, selectProps }: Props<T>): React.ReactElement {
  const { data: baseUnit, isLoading } = useUnitRetrieveQuery({id: baseUnitId || 0});

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!baseUnit) {
    return <div>Unit not found</div>;
  }

  const options = baseUnit.compatible_units ? 
    baseUnit.compatible_units.map((unit: { [key: string]: string }) => {
      return { value: unit.id, label: unit.symbol } 
    }) : [];

  return (
    <SelectField label={label} name={name} options={options} control={control} rules={rules} selectProps={selectProps} />
  );
};

export default UnitField;