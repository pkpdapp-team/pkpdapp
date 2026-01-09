import { ReactElement } from "react";
import { Control, FieldPath, FieldValues } from "react-hook-form";
import { SelectProps, SxProps } from "@mui/material";
import { Compound, UnitRead } from "../app/backendApi";
import SelectField from "./SelectField";

type Props<T extends FieldValues> = {
  label: string;
  baseUnit?: UnitRead;
  baseUnit2?: UnitRead;
  name: FieldPath<T>;
  control: Control<T>;
  rules?: Record<string, unknown>;
  selectProps?: SelectProps;
  compound?: Compound;
  size?: "small" | "medium";
  sx?: SxProps;
  mustHaveMol?: boolean;
};

function UnitField<T extends FieldValues>({
  label,
  name,
  baseUnit,
  baseUnit2,
  control,
  rules,
  selectProps,
  size = "medium",
  sx,
  mustHaveMol = false,
}: Props<T>): ReactElement {
  const isDimensionless = baseUnit?.symbol === "" || false;
  if (!baseUnit || isDimensionless) {
    selectProps = { ...selectProps, disabled: true };
  }

  const allCompatibleUnits = baseUnit?.compatible_units.concat(baseUnit2?.compatible_units || [])
  const compatibleUnits = mustHaveMol
    ? allCompatibleUnits?.filter((unit) => unit.symbol.includes("mol"))
    : allCompatibleUnits;

  const options = compatibleUnits
    ? compatibleUnits.map((unit: { [key: string]: string }) => {
      return { value: unit.id, label: unit.symbol };
    })
    : [];

  return (
    <SelectField
      size={size}
      sx={sx}
      label={label}
      name={name}
      options={options}
      control={control}
      rules={rules}
      selectProps={selectProps}
    />
  );
}

export default UnitField;
