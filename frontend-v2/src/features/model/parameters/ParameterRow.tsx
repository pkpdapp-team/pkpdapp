import { FC, useEffect, useMemo, useState } from "react";
import { ModelFormData } from "../modelFormState";
import {
  Control,
  useFieldArray,
  useForm,
  useWatch,
  UseFormSetValue,
} from "react-hook-form";
import {
  TableCell,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Select,
  SelectChangeEvent,
  MenuItem,
  Stack,
  Checkbox as MuiCheckbox,
} from "@mui/material";
import {
  useVariableUpdateMutation,
  ProjectRead,
  VariableRead,
  DistributionRead,
  PdfEnum,
  CombinedModelRead,
  useVariableRetrieveQuery,
  useCovariateListQuery,
  DerivedVariableTypeEnum,
} from "../../../app/backendApi";
import { UnitReadWithCompatible } from "../../../shared/unitConversion";
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

// Variance pre-filled when a parameter is first made a population parameter.
export const DEFAULT_POPULATION_VARIANCE = 0.09;

// display helper: trim floating-point noise from converted values
const formatNumber = (value: number) => String(Number(value.toPrecision(6)));

// The random-effect spread is stored as the ETA variance (distribution.variance)
// but entered as a standard deviation, which is more intuitive. This shows
// sqrt(variance) and commits value^2 back to the form (triggering the row's
// dirty -> auto-save). A local buffer keeps typing smooth; when not editing, the
// display tracks the stored variance (e.g. after a pdf change or the toggle).
const StdDeviationField: FC<{
  control: Control<VariableRead>;
  setValue: UseFormSetValue<VariableRead>;
  disabled: boolean;
}> = ({ control, setValue, disabled }) => {
  const variance = useWatch({ control, name: "distribution.variance" }) ?? 0;
  const [buffer, setBuffer] = useState<string | null>(null);
  const display =
    buffer ?? formatNumber(Math.sqrt(Math.max(0, variance as number)));
  return (
    <TextField
      sx={{ minWidth: "4rem" }}
      size="small"
      type="number"
      label="Std deviation"
      disabled={disabled}
      value={display}
      slotProps={{ htmlInput: { min: 0, step: "any" } }}
      onChange={(event) => setBuffer(event.target.value)}
      onBlur={() => {
        if (buffer !== null) {
          const std = parseFloat(buffer);
          if (Number.isFinite(std) && std >= 0) {
            setValue("distribution.variance", std * std, { shouldDirty: true });
          }
          setBuffer(null);
        }
      }}
    />
  );
};

// The default distribution for a newly-ticked population parameter: logit for a
// parameter bounded to exactly [0, 1] (a probability/fraction), lognormal otherwise.
export function defaultDistributionPdf(
  lower?: number | null,
  upper?: number | null,
): PdfEnum {
  return lower === 0 && upper === 1 ? "logit" : "lognormal";
}

interface Props {
  model: CombinedModelRead;
  project: ProjectRead;
  variable_from_list: VariableRead;
  variables: VariableRead[];
  units: UnitReadWithCompatible[];
  modelControl: Control<ModelFormData>;
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
    setValue,
    watch,
    formState: { isDirty },
  } = useForm<VariableRead>({
    defaultValues: variable || { name: "" },
    values: variable,
  });
  const [updateVariable] = useVariableUpdateMutation();
  const { data: covariates } = useCovariateListQuery(
    { projectId: project.id },
    { skip: !project.id },
  );
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
    variable.qname.startsWith("PK") || variable.qname.startsWith("Extra") || variable.qname.startsWith("Effect")
  const isNonlin = variable.qname.startsWith("PKNonlin");
  const isUD = variable.qname.endsWith("_ud");
  const type = isUD ? "UD" : isPD ? "PD" : "PK";

  const unit =
    variable.unit === null
      ? undefined
      : units.find((u) => u.id === variable.unit);

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
      { value: "TEM", label: "Time Emax" },
      { value: "TIM", label: "Time Imax" },
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

  // covariate derived variables live on the same field array but are handled by
  // the Covariates column, so they must be ignored here
  const covariateTypes: DerivedVariableTypeEnum[] = [
    "WTC",
    "AGC",
    "SXC",
    "CCC",
    "CCT",
  ];
  let nonlinearityValue = "";
  let nonlinearityIndex = -1;
  let nonlinearityConcentration: null | undefined | number = null;
  for (let i = 0; i < derivedVariables.length; i++) {
    if (
      derivedVariables[i].pk_variable === variable.id &&
      !covariateTypes.includes(derivedVariables[i].type)
    ) {
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
    } else if (nonlinearityValue === "TEM") {
      // TODO: replace with a dedicated Time Emax help image when available
      nonlinearityDocImage = "Time_induction.JPG";
    } else if (nonlinearityValue === "TIM") {
      // TODO: replace with a dedicated Time Imax help image when available
      nonlinearityDocImage = "Time_inhibition.JPG";
    } else if (nonlinearityValue === "TDI") {
      nonlinearityDocImage = "Time_inhibition.JPG";
    } else if (nonlinearityValue === "IND") {
      nonlinearityDocImage = "Time_induction.JPG";
    }
  }
  const timeVaryingVariables = variables.filter(
    (v) => !v.constant && (v.qname.startsWith("PK") && !v.qname.endsWith("_MM")) || v.qname.startsWith("Extravascular.Aa"),
  );
  const concentrationOptions = timeVaryingVariables.map((variable) => ({
    value: variable.id,
    label: variable.name,
  }));
  // variable C1 is the default concentration variable
  const concentrationDefault = timeVaryingVariables.find(
    (variable) => variable.name === "C1" || variable.name === "C1_f",
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

  // --- covariates -----------------------------------------------------------
  // Each option toggles a covariate derived variable on this parameter. Options
  // are the three built-ins plus any custom covariate defined for the project.
  // Keys are the covariate type for built-ins and "<type>:<covariateId>" for
  // custom covariates (so the same custom type can appear more than once).
  const covariateOptions: { key: string; label: string }[] = [
    // Weight is centred on the project species weight, so it is only offered for
    // human-species projects (which have a sensible default weight).
    ...(project.species === "H" ? [{ key: "WTC", label: "Weight" }] : []),
    { key: "AGC", label: "Age" },
    { key: "SXC", label: "Sex" },
    ...(covariates || []).map((covariate) => ({
      key: `${covariate.type === "CAT" ? "CCT" : "CCC"}:${covariate.id}`,
      label: covariate.name,
    })),
  ];
  const covariateKeyForDerived = (dv: {
    type: DerivedVariableTypeEnum;
    covariate?: number | null;
  }): string =>
    dv.type === "CCC" || dv.type === "CCT"
      ? `${dv.type}:${dv.covariate}`
      : dv.type;
  const selectedCovariateKeys: string[] = [];
  const covariateIndexByKey: Record<string, number> = {};
  derivedVariables.forEach((dv, index) => {
    if (
      dv.pk_variable === variable.id &&
      covariateTypes.includes(dv.type as DerivedVariableTypeEnum)
    ) {
      const key = covariateKeyForDerived(dv);
      selectedCovariateKeys.push(key);
      covariateIndexByKey[key] = index;
    }
  });
  const handleCovariatesChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const newKeys = typeof value === "string" ? value.split(",") : value;
    const toRemove = selectedCovariateKeys.filter((k) => !newKeys.includes(k));
    const toAdd = newKeys.filter((k) => !selectedCovariateKeys.includes(k));
    const removeIndices = toRemove
      .map((k) => covariateIndexByKey[k])
      .filter((i) => i !== undefined);
    if (removeIndices.length > 0) {
      derivedVariablesRemove(removeIndices);
    }
    toAdd.forEach((key) => {
      const [type, covariateId] = key.split(":");
      derivedVariablesAppend({
        pk_variable: variable.id,
        pkpd_model: model.id,
        type: type as DerivedVariableType,
        covariate: covariateId ? parseInt(covariateId) : undefined,
      });
    });
  };
  const showCovariates =
    (isPK || isPD) && !isNonlin && !variable.qname.startsWith("Covariates.");

  // a parameter may have a nonlinearity or covariate(s), but not both
  const hasCovariates = selectedCovariateKeys.length > 0;
  const hasNonlinearity = nonlinearityIndex !== -1;
  const nonlinearityDisabledReason =
    "A parameter cannot have both a nonlinearity and a covariate. " +
    "Remove the selected covariate(s) to choose a nonlinearity.";
  const covariatesDisabledReason =
    "A parameter cannot have both a nonlinearity and a covariate. " +
    "Set the nonlinearity to None to choose covariates.";

  const distribution = watch("distribution");
  const distributionOptions: { value: PdfEnum; label: string }[] = [
    { value: "normal", label: "Normal" },
    { value: "lognormal", label: "Log-normal" },
    { value: "logit", label: "Logit-normal" },
  ];
  const handlePopulationToggle = (checked: boolean) => {
    if (checked) {
      setValue(
        "distribution",
        {
          pdf: defaultDistributionPdf(
            watch("lower_bound"),
            watch("upper_bound"),
          ),
          variance: DEFAULT_POPULATION_VARIANCE,
        } as DistributionRead,
        { shouldDirty: true },
      );
    } else {
      setValue("distribution", null, { shouldDirty: true });
    }
  };
  const handleDistributionChange = (event: SelectChangeEvent<string>) => {
    setValue(
      "distribution",
      {
        ...distribution,
        pdf: event.target.value as PdfEnum,
        variance: distribution?.variance ?? DEFAULT_POPULATION_VARIANCE,
      } as DistributionRead,
      { shouldDirty: true },
    );
  };

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
      <TableCell size="small" sx={{ width: "19rem" }}>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <MuiCheckbox
            size="small"
            checked={!!distribution}
            onChange={(event) => handlePopulationToggle(event.target.checked)}
            disabled={defaultProps.disabled}
            slotProps={{ input: { "aria-label": "Population" } }}
          />
          {distribution && (
            <>
              <Select
                size="small"
                sx={{ minWidth: "8.7rem" }}
                value={distribution.pdf ?? "lognormal"}
                onChange={handleDistributionChange}
                {...defaultProps}
              >
                {distributionOptions.map((option) => (
                  <MenuItem value={option.value} key={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              <StdDeviationField
                control={control}
                setValue={setValue}
                disabled={defaultProps.disabled}
              />
            </>
          )}
        </Stack>
      </TableCell>
      <TableCell size="small" sx={{ width: "20rem" }}>
        {isPK && !isNonlin && (
          <Stack direction="row" spacing={2}>
            <Tooltip title={hasCovariates ? nonlinearityDisabledReason : ""}>
              <span>
                <Select
                  size="small"
                  value={nonlinearityValue}
                  onChange={handleNonlinearityChange}
                  displayEmpty
                  disabled={defaultProps.disabled || hasCovariates}
                >
                  {nonlinearityOptions.map((option) => (
                    <MenuItem value={option.value} key={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </span>
            </Tooltip>
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
      <TableCell size="small" sx={{ width: "16rem" }}>
        {showCovariates && (
          <Tooltip title={hasNonlinearity ? covariatesDisabledReason : ""}>
            <span>
              <Select
                size="small"
                multiple
                displayEmpty
                sx={{ minWidth: "10rem" }}
                value={selectedCovariateKeys}
                onChange={handleCovariatesChange}
                disabled={defaultProps.disabled || hasNonlinearity}
                renderValue={(selected) =>
                  selected.length === 0
                    ? "None"
                    : covariateOptions
                        .filter((option) => selected.includes(option.key))
                        .map((option) => option.label)
                        .join(", ")
                }
              >
                {covariateOptions.map((option) => (
                  <MenuItem value={option.key} key={option.key}>
                    <MuiCheckbox
                      size="small"
                      checked={selectedCovariateKeys.includes(option.key)}
                    />
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </span>
          </Tooltip>
        )}
      </TableCell>
    </TableRow>
  );
};

export default ParameterRow;
