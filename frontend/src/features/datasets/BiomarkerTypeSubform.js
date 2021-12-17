import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import IconButton from "@material-ui/core/IconButton";
import { useForm, useFormState } from "react-hook-form";
import SaveIcon from "@material-ui/icons/Save";

import {
  FormCheckboxField,
  FormTextField,
  FormSelectField,
} from "../forms/FormComponents";
import { selectUnitById } from "../projects/unitsSlice";
import {
  selectBiomarkerTypeById,
  updateBiomarkerType,
} from "./biomarkerTypesSlice";

export default function BiomarkerTypeSubform({ biomarker_id, disableSave }) {
  const dispatch = useDispatch();
  let biomarker_type = useSelector((state) =>
    selectBiomarkerTypeById(state, biomarker_id)
  );
  if (!biomarker_type) {
    biomarker_type = {
      default_value: false,
      axis: false,
    };
  }
  const unit_id = biomarker_type ? biomarker_type.display_unit : 1;
  let unit = useSelector((state) => selectUnitById(state, unit_id));
  if (!unit) {
    unit = {
      symbol: "X",
      compatible_units: [],
    };
  }
  const unitOptions = unit.compatible_units.map((u) => {
    return { key: u.symbol, value: u.id };
  });

  const time_unit_id = biomarker_type ? biomarker_type.display_time_unit : 1;
  let time_unit = useSelector((state) => selectUnitById(state, time_unit_id));
  if (!time_unit) {
    time_unit = {
      symbol: "X",
      compatible_units: [],
    };
  }
  const timeUnitOptions = time_unit.compatible_units.map((u) => {
    return { key: u.symbol, value: u.id };
  });

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      id: biomarker_type.id,
      display: biomarker_type.display,
      name: biomarker_type.name,
      color: biomarker_type.color,
      display_unit: biomarker_type.display_unit,
      display_time_unit: biomarker_type.display_time_unit,
      axis: biomarker_type.axis,
    },
  });

  const { isDirty } = useFormState({ control });

  useEffect(() => {
    reset(biomarker_type);
  }, [reset, biomarker_type]);

  const onSubmit = (values) => {
    console.log("submit biomarker_type", values);
    dispatch(updateBiomarkerType(values));
  };

  const axisOptions = [
    { value: false, key: "LHS" },
    { value: true, key: "RHS" },
  ];

  return (
    <React.Fragment>
      <FormCheckboxField
        control={control}
        name={"display"}
        label={biomarker_type.name}
      />
      <FormSelectField
        control={control}
        name={"display_unit"}
        label={"Unit"}
        options={unitOptions}
      />
      <FormSelectField
        control={control}
        name={"display_time_unit"}
        label={"Time Unit"}
        options={timeUnitOptions}
      />
      <FormTextField
        control={control}
        name={"color"}
        label={"Color"}
        type="number"
      />
      <FormSelectField
        control={control}
        name={"axis"}
        label={"Axis"}
        options={axisOptions}
      />
      {isDirty && (
        <IconButton
          onClick={handleSubmit(onSubmit)}
          size="small"
          disabled={disableSave}
        >
          <SaveIcon />
        </IconButton>
      )}
    </React.Fragment>
  );
}
