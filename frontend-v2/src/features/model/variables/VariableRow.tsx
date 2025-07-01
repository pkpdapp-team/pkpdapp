// src/components/ProjectTable.tsx
import { FC, useEffect } from "react";
import { Control } from "react-hook-form";
import {
  TableCell,
  TableRow,
  Checkbox as MuiCheckbox,
  FormControlLabel,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  CombinedModelRead,
  CompoundRead,
  ProjectRead,
  UnitRead,
  VariableRead,
} from "../../../app/backendApi";
import { FormData } from "../Model";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import { selectIsProjectShared } from "../../login/loginSlice";
import { useFormData, useVariableFormState } from "./variableUtils";
import { derivedIndex } from "../derivedVariable";

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
  isAnyLagTimeSelected: boolean;
}

const VariableRow: FC<Props> = ({
  project,
  compound,
  model,
  variable,
  control,
  effectVariable,
  units,
  timeVariable,
  updateDosings,
  isAnyDosingSelected,
  updateLinksToPd,
  updateLagTimes,
  isAnyLagTimeSelected,
}) => {
  const {
    mappings,
    derivedVariables,
    derivedVariablesAppend,
    derivedVariablesRemove,
  } = useFormData({ control });
  const { addProtocol, removeProtocol, setValue, updateVariable, hasProtocol } =
    useVariableFormState({
      compound,
      project,
      timeVariable,
      units,
      variable,
    });

  const addTLG = () => {
    derivedVariablesAppend({
      pk_variable: variable.id,
      pkpd_model: model.id,
      type: "TLG",
    });
  };

  const tlgIndex = derivedIndex("TLG", derivedVariables, variable);

  const removeTLG = () => {
    derivedVariablesRemove(tlgIndex);
  };

  const onClickTLG = () => {
    return tlgIndex >= 0 ? removeTLG() : addTLG();
  };

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
    setValue("protocol", null);
    updateVariable({
      id: variable.id,
      variable: { ...variable, protocol: null },
    });
    removeProtocol();
  }

  const isSharedWithMe = useSelector((state: RootState) =>
    selectIsProjectShared(state, project),
  );

  const isPD = variable.qname.startsWith("PD");
  const linkToPD = isPD
    ? false
    : mappings.find((mapping) => mapping.pk_variable === variable.id) !==
      undefined;

  useEffect(() => {
    updateDosings(variable.id, hasProtocol);
  }, [variable.id, hasProtocol, updateDosings]);

  useEffect(() => {
    updateLinksToPd(variable.id, linkToPD);
  }, [variable.id, linkToPD, updateLinksToPd]);

  const isLinkedToTLG = derivedIndex("TLG", derivedVariables, variable) >= 0;
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
  const amountUnit = version_greater_than_2
    ? units.find((unit) => unit.symbol === "pmol")
    : units.find((unit) => unit.symbol === (isClinical ? "pmol" : "pmol/kg"));
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

  const variable_name = variable.name;

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
      {model.has_lag && (
        <TableCell size="small" sx={{ width: "5rem" }}>
          <FormControlLabel
            control={
              <MuiCheckbox
                sx={{
                  "& .MuiSvgIcon-root": {
                    color: isAnyLagTimeSelected ? "inherit" : "red",
                  },
                }}
                checked={isLinkedToTLG}
                onClick={onClickTLG}
                data-cy={`checkbox-tlag-${variable.name}`}
                disabled={isSharedWithMe}
                aria-label={`Lag time: ${variable.name}`}
              />
            }
            label=""
          />
        </TableCell>
      )}
      <TableCell size="small">
        {!noDosing && (
          <FormControlLabel
            control={
              <MuiCheckbox
                aria-label={`Dosing compartment: ${variable.name}`}
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
