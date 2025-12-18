import { FC, useEffect, useMemo } from "react";
import { FormData } from "../Model";
import { Control, useFieldArray, useForm } from "react-hook-form";
import {
  TableCell,
  TableRow,
  Tooltip,
  Typography,
  Select,
  SelectChangeEvent,
  MenuItem,
  Stack,
} from "@mui/material";
import {
  useVariableUpdateMutation,
  ProjectRead,
  UnitRead,
  VariableRead,
  CombinedModelRead,
  useVariableRetrieveQuery,
} from "../../../app/backendApi";
import UnitField from "../../../components/UnitField";
import Checkbox from "../../../components/Checkbox";
import useDirty from "../../../hooks/useDirty";
import FloatField from "../../../components/FloatField";
import HelpButton from "../../../components/HelpButton";
import { selectIsProjectShared } from "../../login/loginSlice";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { DerivedVariableType } from "../derivedVariable";
import { hasPerWeightOption } from "../../../shared/hasPerWeightOption";
import parameterDisplayName from "./parameterDisplayName";
interface Props {
  model: CombinedModelRead;
  project: ProjectRead;
  variable_from_list: VariableRead;
  variables: VariableRead[];
  units: UnitRead[];
  modelControl: Control<FormData>;
}

const ParameterRow: FC<Props> = ({
  model,
  project,
  variable_from_list,
  variables,
  units,
  modelControl,
}) => {
  const { data: variable_read } = useVariableRetrieveQuery({
    id: variable_from_list.id,
  });
  const variable = variable_read || variable_from_list;
  const {
    control,
    handleSubmit,
    formState: { isDirty, submitCount },
  } = useForm<VariableRead>({
    defaultValues: variable || { name: "" },
    values: variable,
  });
  const [updateVariable] = useVariableUpdateMutation();
  useDirty(isDirty);

  const isSharedWithMe = useSelector((state: RootState) =>
    selectIsProjectShared(state, project),
  );

  const {
    fields: derivedVariables,
    append: derivedVariablesAppend,
    remove: derivedVariablesRemove,
    update: derivedVariablesUpdate,
  } = useFieldArray({
    control: modelControl,
    name: "derived_variables",
  });

  const submit = useMemo(
    () =>
      handleSubmit((data) => {
        if (
          variable_read &&
          JSON.stringify(data) !== JSON.stringify(variable_read)
        ) {
          updateVariable({ id: variable_read.id, variable: data });
        }
      }),
    [handleSubmit, updateVariable, variable_read],
  );

  useEffect(() => {
    if (isDirty) {
      submit();
    }
  }, [isDirty, submit]);

  if (variable.constant !== true) {
    return null;
  }

  const isPD = variable.qname.startsWith("PD");
  const isPK =
    variable.qname.startsWith("PK") || variable.qname.startsWith("Extra");
  const isNonlin = variable.qname.startsWith("PKNonlin");
  const isUD = variable.qname.endsWith("_ud");
  const type = isUD ? "UD" : isPD ? "PD" : "PK";

  const unit =
    variable.unit === null
      ? undefined
      : units.find((u) => u.id === variable.unit);
  const isPreclinicalPerKg =
    project?.species !== "H" && unit?.symbol.endsWith("/kg");

  const defaultProps = {
    disabled: isSharedWithMe,
  };

  let nonlinearityOptions: {
    value: DerivedVariableType | "";
    label: string;
  }[] = [
      { value: "EMX", label: "Dose Emax" },
      { value: "IMX", label: "Dose Imax" },
      { value: "POW", label: "Dose Power Increase" },
      { value: "NPW", label: "Dose Power Decrease" },
      { value: "TDI", label: "Time Decrease" },
      { value: "IND", label: "Time Increase" },
      { value: "", label: "None" },
    ];

  // Volume parameters should not have MM or EMM nonlinearity
  if (!variable.name.startsWith("V")) {
    nonlinearityOptions = [
      { value: "MM", label: "Michaelis-Menten (2 parameters)" },
      { value: "EMM", label: "Michaelis-Menten (4 parameters)" },
      ...nonlinearityOptions,
    ];
  }

  let nonlinearityValue = "";
  let nonlinearityIndex = -1;
  let nonlinearityConcentration: null | undefined | number = null;
  for (let i = 0; i < derivedVariables.length; i++) {
    if (derivedVariables[i].pk_variable === variable.id) {
      if (
        derivedVariables[i].type === "MM" ||
        derivedVariables[i].type === "EMM"
      ) {
        nonlinearityConcentration = derivedVariables[i].secondary_variable;
      }
      nonlinearityValue = derivedVariables[i].type;
      nonlinearityIndex = i;
    }
  }

  let nonlinearityDocImage = "";
  if (nonlinearityValue) {
    if (nonlinearityValue === "MM") {
      nonlinearityDocImage = "Conc_Michaelis Menten.JPG";
    } else if (nonlinearityValue === "EMM") {
      nonlinearityDocImage = "Conc_Michaelis Menten (4Param).jpg";
    } else if (nonlinearityValue === "EMX") {
      nonlinearityDocImage = "Dose_increase_w.JPG";
    } else if (nonlinearityValue === "IMX") {
      nonlinearityDocImage = "Dose_decrease_w.JPG";
    } else if (nonlinearityValue === "POW") {
      nonlinearityDocImage = "Dose_increase_wo.JPG";
    } else if (nonlinearityValue === "NPW") {
      nonlinearityDocImage = "Dose_decrease_wo.JPG";
    } else if (nonlinearityValue === "TDI") {
      nonlinearityDocImage = "Time_inhibition.JPG";
    } else if (nonlinearityValue === "IND") {
      nonlinearityDocImage = "Time_induction.JPG";
    }
  }
  const timeVaryingVariables = variables.filter(
    (v) => !v.constant && v.qname.startsWith("PK") && !v.qname.endsWith("_MM"),
  );
  const concentrationOptions = timeVaryingVariables.map((variable) => ({
    value: variable.id,
    label: variable.name,
  }));
  // variable C1 is the default concentration variable
  const concentrationDefault = timeVaryingVariables.find(
    (variable) => variable.name === "C1",
  )?.id;

  const handleNonlinearityChange = (event: SelectChangeEvent<string>) => {
    let secondaryVariable = undefined;
    if (event.target.value === "MM" || event.target.value === "EMM") {
      if (nonlinearityConcentration) {
        secondaryVariable = nonlinearityConcentration;
      } else {
        secondaryVariable = concentrationDefault;
      }
    }
    // if current nonlinearity is empty, add new nonlinearity
    if (nonlinearityIndex === -1 && event.target.value !== "") {
      const value = event.target.value as DerivedVariableType;
      derivedVariablesAppend({
        pk_variable: variable.id,
        pkpd_model: model.id,
        type: value,
        secondary_variable: secondaryVariable,
      });
      return;
    } else if (event.target.value === "") {
      // remove current nonlinearity
      derivedVariablesRemove(nonlinearityIndex);
    } else {
      // update the nonlinearity
      const value = event.target.value as DerivedVariableType;
      derivedVariablesUpdate(nonlinearityIndex, {
        pk_variable: variable.id,
        pkpd_model: model.id,
        type: value,
        secondary_variable: secondaryVariable,
      });
    }
  };

  const handleNonlinearityConcChange = (event: SelectChangeEvent<number>) => {
    // update the secondary variable for the nonlinearity
    if (event.target.value) {
      const value =
        typeof event.target.value === "string"
          ? parseInt(event.target.value)
          : event.target.value;
      derivedVariablesUpdate(nonlinearityIndex, {
        pk_variable: variable.id,
        pkpd_model: model.id,
        type: nonlinearityValue as DerivedVariableType,
        secondary_variable: value,
      });
    }
  };

  const variable_name = parameterDisplayName(variable, model);

  return (
    <TableRow>
      <TableCell size="small" sx={{ width: "5rem" }}>
        <Tooltip title={variable.description}>
          <Typography>{variable_name}</Typography>
        </Tooltip>
      </TableCell>
      <TableCell size="small" sx={{ width: "5rem" }}>
        {type}
      </TableCell>
      <TableCell size="small" sx={{ width: "10rem" }}>
        <FloatField
          sx={{ minWidth: "5rem" }}
          size="small"
          name="lower_bound"
          control={control}
          label="Lower"
          textFieldProps={defaultProps}
        />
      </TableCell>
      <TableCell size="small" sx={{ width: "10rem" }}>
        <FloatField
          sx={{ minWidth: "5rem" }}
          size="small"
          name="default_value"
          control={control}
          label="Value"
          rules={{ required: true }}
          data_cy={`parameter-${variable.name}-value`}
          textFieldProps={defaultProps}
        />
      </TableCell>
      <TableCell size="small" sx={{ width: "10rem" }}>
        <FloatField
          sx={{ minWidth: "5rem" }}
          size="small"
          name="upper_bound"
          control={control}
          label="Upper"
          textFieldProps={defaultProps}
        />
      </TableCell>
      <TableCell size="small" sx={{ width: "10rem" }}>
        <UnitField
          size="small"
          sx={{ minWidth: "8rem" }}
          label={"Unit"}
          name={"unit"}
          control={control}
          baseUnit={unit}
          isPreclinicalPerKg={isPreclinicalPerKg}
          selectProps={defaultProps}
        />
      </TableCell>
      <TableCell size="small" sx={{ width: "10rem" }}>
        {hasPerWeightOption(unit, variable) && (
          <Checkbox
            label=""
            name="unit_per_body_weight"
            control={control}
            checkboxFieldProps={defaultProps}
          />
        )}
      </TableCell>
      <TableCell size="small">
        {isPK && !isNonlin && (
          <Stack direction="row" spacing={2}>
            <Select
              size="small"
              value={nonlinearityValue}
              onChange={handleNonlinearityChange}
              displayEmpty
              {...defaultProps}
            >
              {nonlinearityOptions.map((option) => (
                <MenuItem value={option.value} key={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {nonlinearityConcentration && (
              <Select
                size="small"
                value={nonlinearityConcentration}
                onChange={handleNonlinearityConcChange}
                {...defaultProps}
              >
                {concentrationOptions.map((option) => (
                  <MenuItem value={option.value} key={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            )}
            {nonlinearityDocImage && (
              <HelpButton
                title={nonlinearityDocImage}
                placement="left"
                maxWidth="550px"
              >
                <img
                  src={`nonlinearities/${nonlinearityDocImage}`}
                  alt="doc"
                  style={{ maxWidth: "500px" }}
                />
              </HelpButton>
            )}
          </Stack>
        )}
      </TableCell>
    </TableRow>
  );
};

export default ParameterRow;
