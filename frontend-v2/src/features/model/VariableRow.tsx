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
  Radio,
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
  isAnyLinkToPdSelected: boolean;
  updateLagTimes: (key: number, value: boolean) => void;
  isAnyLagTimeSelected: boolean;
}

type DerivedVariableType = "RO" | "FUP" | "BPR" | "TLG";

const derivedVariableRegex = /calc_.*_(f|bl|RO)/;

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
  isAnyLinkToPdSelected,
  updateLagTimes,
  isAnyLagTimeSelected,
}) => {
  const {
    fields: mappings,
    append: appendMapping,
    remove: removeMapping,
  } = useFieldArray({
    control,
    name: "model.mappings",
  });
  const {
    fields: derivedVariables,
    append: derivedVariablesAppend,
    remove: derivedVariablesRemove,
  } = useFieldArray({
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
          // @ts-expect-error
          if (data.lower_bound === "") {
            data.lower_bound = null;
          }
          // @ts-expect-error
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

  const onClickDerived = (type: DerivedVariableType) => () => {
    const index = derivedIndex(type);
    return index >= 0 ? removeDerived(index) : addDerived(type);
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
        removeMapping(0);
      }
      appendMapping({
        pk_variable: variable.id,
        pd_variable: effectVariable.id,
        pkpd_model: model.id,
      });
    }
  };

  const removePDMapping = () => {
    const mapping_index = mappings.findIndex(
      (mapping) => mapping.pk_variable === variable.id,
    );
    if (mapping_index >= 0) {
      removeMapping(mapping_index);
    }
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

  return (
    <TableRow>
      <TableCell>
        <Tooltip title={variable.description}>
          <Typography>{variable.name}</Typography>
        </Tooltip>
      </TableCell>
      <TableCell>{variableUnit?.symbol}</TableCell>
      <TableCell>{isPD ? "PD" : "PK"}</TableCell>
      <TableCell>
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
      {modelHaveTLag && (
        <TableCell>
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
        <TableCell>
          {!noMapToPD && (
            <FormControlLabel
              control={
                <Radio
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
      <TableCell>
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
      <TableCell>
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
      <TableCell>
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
    </TableRow>
  );
};

export default VariableRow;
