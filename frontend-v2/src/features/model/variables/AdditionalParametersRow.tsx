import { FC, useEffect } from "react";
import { Control } from "react-hook-form";
import {
  TableCell,
  TableRow,
  Checkbox as MuiCheckbox,
  FormControlLabel,
  Tooltip,
  Typography,
  Radio,
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
  updateLinksToPd: (key: number, value: boolean) => void;
  isAnyLinkToPdSelected: boolean;
  updateLagTimes: (key: number, value: boolean) => void;
  isAnyLagTimeSelected: boolean;
  onChange: () => void;
}

type DerivedVariableType = "AUC" | "RO" | "FUP" | "BPR" | "TLG";

const derivedVariableRegex = /calc_.*_(f|bl|RO)/;

const AdditionalParametersRow: FC<Props> = ({
  project,
  compound,
  model,
  variable,
  control,
  effectVariable,
  units,
  timeVariable,
  updateDosings,
  updateLinksToPd,
  isAnyLinkToPdSelected,
  updateLagTimes,
  isAnyLagTimeSelected,
  onChange,
}) => {
  const {
    mappings,
    mappingsAppend,
    mappingsRemove,
    derivedVariables,
    derivedVariablesAppend,
    derivedVariablesRemove,
  } = useFormData({ control });
  const { hasProtocol } = useVariableFormState({
    compound,
    project,
    timeVariable,
    units,
    variable,
  });

  const isSharedWithMe = useSelector((state: RootState) =>
    selectIsProjectShared(state, project),
  );

  const isPD = variable.qname.startsWith("PD");
  const linkToPD = isPD
    ? false
    : mappings.find((mapping) => mapping.pk_variable === variable.id) !==
      undefined;

  const onClickDerived = (type: DerivedVariableType) => () => {
    const index = derivedIndex(type);
    if (index >= 0) {
      removeDerived(index);
    } else {
      addDerived(type);
    }
    onChange();
  };

  const derivedIndex = (type: DerivedVariableType) => {
    return derivedVariables.findIndex(
      (ro) => ro.pk_variable === variable.id && ro.type === type,
    );
  };

  const isLinkedTo = (type: DerivedVariableType) => {
    return derivedIndex(type) >= 0;
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

  const addPDMapping = () => {
    if (effectVariable) {
      if (mappings.length > 0) {
        mappingsRemove(0);
      }
      mappingsAppend({
        pk_variable: variable.id,
        pd_variable: effectVariable.id,
        pkpd_model: model.id,
      });
    }
    onChange();
  };

  const removePDMapping = () => {
    const mapping_index = mappings.findIndex(
      (mapping) => mapping.pk_variable === variable.id,
    );
    if (mapping_index >= 0) {
      mappingsRemove(mapping_index);
    }
    onChange();
  };

  const addDerived = (type: DerivedVariableType) => {
    // can only be one 'FUP' and one 'BPR' across all variables
    const sameType = derivedVariables
      .map((d, i) => ({ ...d, index: i }))
      .filter((ro) => ro.type === type)
      .map((ro) => ro.index);

    const onlyOne = type === "FUP" || type === "BPR";
    if (onlyOne && sameType.length > 0) {
      removeDerived(sameType);
    }

    derivedVariablesAppend({
      pk_variable: variable.id,
      pkpd_model: model.id,
      type,
    });
  };

  const removeDerived = (index: number | number[]) => {
    derivedVariablesRemove(index);
  };

  const noMapToPD = isPD || effectVariable === undefined || !isConcentration;
  const noDerivedVariables = !isConcentration || isPD;
  const isC1 = model.is_library_model && variable.qname.endsWith(".C1");
  const disableAuc = false;
  const disableRo =
    !compound.dissociation_constant || !compound.target_concentration;
  const disableFUP =
    !compound.fraction_unbound_plasma || compound.compound_type === "LM";
  const disableBPR =
    !compound.blood_to_plasma_ratio || compound.compound_type === "LM";
  const noDosing = !isAmount;

  const isDerivedVariable = variable.name.match(derivedVariableRegex) !== null;

  if (noMapToPD && noDerivedVariables && noDosing) {
    return null;
  }

  const modelHaveTLag = model.has_lag;

  return !modelHaveTLag && noMapToPD && noDerivedVariables ? null : (
    <TableRow>
      <TableCell size="small" width="5rem">
        <Tooltip title={variable.description}>
          <Typography>{variable.name}</Typography>
        </Tooltip>
      </TableCell>
      {modelHaveTLag && (
        <TableCell size="small" sx={{ width: "5rem" }}>
          {!noDosing && (
            <FormControlLabel
              control={
                <MuiCheckbox
                  sx={{
                    "& .MuiSvgIcon-root": {
                      color: isAnyLagTimeSelected ? "inherit" : "red",
                    },
                  }}
                  checked={isLinkedTo("TLG")}
                  onClick={onClickDerived("TLG")}
                  data-cy={`checkbox-tlag-${variable.name}`}
                  disabled={isSharedWithMe}
                />
              }
              label=""
            />
          )}
        </TableCell>
      )}
      {model.pd_model && (
        <TableCell size="small" sx={{ width: "8rem" }}>
          {!noMapToPD && (
            <FormControlLabel
              control={
                <Radio
                  aria-label={`Link to PD: ${variable.name}`}
                  sx={{
                    "& .MuiSvgIcon-root": {
                      color: isAnyLinkToPdSelected ? "inherit" : "red",
                    },
                  }}
                  checked={linkToPD}
                  disabled={isSharedWithMe}
                  onClick={() =>
                    linkToPD ? removePDMapping() : addPDMapping()
                  }
                  data-cy={`checkbox-map-to-pd-${variable.name}`}
                />
              }
              label=""
            />
          )}
        </TableCell>
      )}
      <TableCell size="small" sx={{ width: "15rem" }}>
        {!noDerivedVariables && (
          <FormControlLabel
            disabled={disableAuc || isSharedWithMe}
            control={
              <MuiCheckbox
                checked={isLinkedTo("AUC")}
                onClick={onClickDerived("AUC")}
                aria-label={`Secondary parameters: ${variable.name}`}
              />
            }
            label=""
          />
        )}
      </TableCell>
      <TableCell size="small">
        {!noDerivedVariables && (
          <FormControlLabel
            disabled={disableRo || isSharedWithMe}
            control={
              <MuiCheckbox
                checked={isLinkedTo("RO")}
                onClick={onClickDerived("RO")}
              />
            }
            label=""
          />
        )}
      </TableCell>
      {compound.compound_type === "SM" && (
        <>
          <TableCell size="small" sx={{ width: "15rem" }}>
            {isC1 && !noDerivedVariables && !isDerivedVariable && (
              <FormControlLabel
                disabled={disableFUP || isSharedWithMe}
                control={
                  <Radio
                    checked={isLinkedTo("FUP")}
                    onClick={onClickDerived("FUP")}
                  />
                }
                label=""
              />
            )}
          </TableCell>
          <TableCell size="small" sx={{ width: "15rem" }}>
            {isC1 && !noDerivedVariables && !isDerivedVariable && (
              <FormControlLabel
                disabled={disableBPR || isSharedWithMe}
                control={
                  <Radio
                    checked={isLinkedTo("BPR")}
                    onClick={onClickDerived("BPR")}
                  />
                }
                label=""
              />
            )}
          </TableCell>
        </>
      )}
    </TableRow>
  );
};

export default AdditionalParametersRow;
