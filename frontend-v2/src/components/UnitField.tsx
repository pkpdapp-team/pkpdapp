import { ReactElement } from "react";
import { Control, FieldPath, FieldValues } from "react-hook-form";
import { SelectProps, SxProps } from "@mui/material";
import { Compound, UnitRead } from "../app/backendApi";
import SelectField from "./SelectField";

type Props<T extends FieldValues> = {
  label: string;
  baseUnit?: UnitRead;
  name: FieldPath<T>;
  control: Control<T>;
  rules?: Record<string, unknown>;
  selectProps?: SelectProps;
  compound?: Compound;
  size?: "small" | "medium";
  isPreclinicalPerKg?: boolean;
  sx?: SxProps;
};

function UnitField<T extends FieldValues>({
  label,
  name,
  baseUnit,
  control,
  rules,
  selectProps,
  isPreclinicalPerKg,
  size = "medium",
  sx,
}: Props<T>): ReactElement {
  if (!isPreclinicalPerKg) {
    isPreclinicalPerKg = false;
  }

  const isDimensionless = baseUnit?.symbol === "" || false;
  if (!baseUnit || isDimensionless) {
    selectProps = { ...selectProps, disabled: true };
  }

  const compatibleUnits = isPreclinicalPerKg
    ? baseUnit?.compatible_units.filter((unit) => unit.symbol.endsWith("/kg"))
    : baseUnit?.compatible_units;

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
