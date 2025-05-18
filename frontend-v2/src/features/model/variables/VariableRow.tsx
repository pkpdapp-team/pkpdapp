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
  const { mappings, derivedVariables } = useFormData({ control });
  const { addProtocol, removeProtocol, setValue, updateVariable, hasProtocol } =
    useVariableFormState({
      compound,
      project,
      timeVariable,
      units,
      variable,
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
  const amountUnit = units.find(
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

  return noDosing ? null : (
    <TableRow>
      <TableCell size="small" width="5rem">
        <Tooltip title={variable.description}>
          <Typography>{variable.name}</Typography>
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
