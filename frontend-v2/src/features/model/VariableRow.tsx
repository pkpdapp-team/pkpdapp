// src/components/ProjectTable.tsx
import { FC, useEffect } from "react";
import { Control, useFieldArray, useForm } from "react-hook-form";
import {
  TableCell,
  TableRow,
  Checkbox as MuiCheckbox,
  FormControlLabel,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Variable,
  useVariableUpdateMutation,
  CombinedModelRead,
  CompoundRead,
  ProjectRead,
  UnitRead,
  VariableRead,
} from "../../app/backendApi";
import useDirty from "../../hooks/useDirty";
import { FormData } from "./Model";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { selectIsProjectShared } from "../login/loginSlice";
import useEditProtocol from "./useEditProtocol";
import { SimulationContext } from "../../contexts/SimulationContext";

interface Props {
  project: ProjectRead;
  compound: CompoundRead;
  model: CombinedModelRead;
  variable: VariableRead;
  control: Control<FormData>;
  effectVariable: VariableRead | undefined;
  units: UnitRead[];
  timeVariable: VariableRead | undefined;
  updateDosings: (key: number, value: boolean) => void;
  isAnyDosingSelected: boolean;
  updateLinksToPd: (key: number, value: boolean) => void;
  updateLagTimes: (key: number, value: boolean) => void;
}

type DerivedVariableType = "AUC" | "RO" | "FUP" | "BPR" | "TLG";

const VariableRow: FC<Props> = ({
  project,
  compound,
  variable,
  control,
  effectVariable,
  units,
  timeVariable,
  updateDosings,
  isAnyDosingSelected,
  updateLinksToPd,
  updateLagTimes,
}) => {
  const { fields: mappings } = useFieldArray({
    control,
    name: "model.mappings",
  });
  const { fields: derivedVariables } = useFieldArray({
    control,
    name: "model.derived_variables",
  });

  const {
    handleSubmit,
    reset,
    setValue,
    formState: { isDirty: isDirtyForm },
    watch,
  } = useForm<Variable>({ defaultValues: variable || { id: 0, name: "" } });
  const watchProtocolId = watch("protocol");
  const isDirty = watchProtocolId !== variable?.protocol || isDirtyForm;
  useDirty(isDirty);
  const [updateVariable] = useVariableUpdateMutation();
  const { addProtocol, removeProtocol, hasProtocol } = useEditProtocol({
    compound,
    project,
    units,
    timeVariable,
    variable,
    watchProtocolId,
  });
  async function onAddProtocol() {
    const value = await addProtocol();
    if (value?.data) {
      setValue("protocol", value.data.id);
      updateVariable({
        id: variable.id,
        variable: { ...variable, protocol: value.data.id },
      });
    }
  }
  async function onRemoveProtocol() {
    const value = await removeProtocol();
    if (value && "data" in value) {
      setValue("protocol", null);
    }
  }

  const isSharedWithMe = useSelector((state: RootState) =>
    selectIsProjectShared(state, project),
  );

  useEffect(() => {
    reset(variable);
  }, [variable, reset]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isDirty) {
        handleSubmit((data) => {
          // @ts-expect-error - lower_bound and upper_bound can be null
          if (data.lower_bound === "") {
            data.lower_bound = null;
          }
          // @ts-expect-error - lower_bound and upper_bound can be null
          if (data.upper_bound === "") {
            data.upper_bound = null;
          }
          updateVariable({ id: variable.id, variable: data });
        })();
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [handleSubmit, isDirty, updateVariable, variable.id]);

  const isPD = variable.qname.startsWith("PD");
  const linkToPD = isPD
    ? false
    : mappings.find((mapping) => mapping.pk_variable === variable.id) !==
    undefined;

  const derivedIndex = (type: DerivedVariableType) => {
    return derivedVariables.findIndex(
      (ro) => ro.pk_variable === variable.id && ro.type === type,
    );
  };

  useEffect(() => {
    updateDosings(variable.id, hasProtocol);
  }, [variable.id, hasProtocol, updateDosings]);

  useEffect(() => {
    updateLinksToPd(variable.id, linkToPD);
  }, [variable.id, linkToPD, updateLinksToPd]);

  const isLinkedToTLG = derivedIndex("TLG") >= 0;
  useEffect(() => {
    updateLagTimes(variable.id, isLinkedToTLG);
  }, [variable.id, isLinkedToTLG, updateLagTimes]);

  if (
    variable.constant ||
    variable.name === "t" ||
    variable.name === "C_Drug"
  ) {
    return null;
  }

  const concentrationUnit = units.find((unit) => unit.symbol === "pmol/L");
  const isClinical = project.species === "H";
  const version_greater_than_2 = project.version ? project.version >= 3 : false;
  const amountUnit = version_greater_than_2 ?
    units.find(
      (unit) => unit.symbol === "pmol",
    ) :
    units.find(
      (unit) => unit.symbol === (isClinical ? "pmol" : "pmol/kg"),
    );
  const variableUnit = units.find((unit) => unit.id === variable.unit);
  if (concentrationUnit === undefined || amountUnit === undefined) {
    return <>No concentration or amount unit found</>;
  }

  const isConcentration =
    concentrationUnit?.compatible_units.find(
      (unit) => parseInt(unit.id) === variable.unit,
    ) !== undefined;
  const isAmount =
    variableUnit?.symbol !== "" &&
    amountUnit?.compatible_units.find(
      (unit) => parseInt(unit.id) === variable.unit,
    ) !== undefined;


  const noMapToPD = isPD || effectVariable === undefined || !isConcentration;
  const noDerivedVariables = !isConcentration || isPD;
  const noDosing = !isAmount;

  if (noMapToPD && noDerivedVariables && noDosing) {
    return null;
  }

  let variable_name = variable.name;

  return noDosing ? null : (
    <TableRow>
      <TableCell size="small" width="5rem">
        <Tooltip title={variable.description}>
          <Typography>{variable_name}</Typography>
        </Tooltip>
      </TableCell>
      <TableCell size="small" width="5rem">
        {variableUnit?.symbol}
      </TableCell>
      <TableCell size="small" width="5rem">
        {isPD ? "PD" : "PK"}
      </TableCell>
      <TableCell size="small">
        {!noDosing && (
          <FormControlLabel
            control={
              <MuiCheckbox
                sx={{
                  "& .MuiSvgIcon-root": {
                    color: isAnyDosingSelected ? "inherit" : "red",
                  },
                }}
                checked={hasProtocol}
                onClick={hasProtocol ? onRemoveProtocol : onAddProtocol}
                data-cy={`checkbox-dosing-${variable.name}`}
                disabled={isSharedWithMe}
              />
            }
            label=""
          />
        )}
      </TableCell>
    </TableRow>
  );
};

export default VariableRow;
