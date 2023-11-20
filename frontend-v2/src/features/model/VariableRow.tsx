// src/components/ProjectTable.tsx
import React, { useEffect } from "react";
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
import { CombinedModel, Variable, useVariableUpdateMutation, useProtocolCreateMutation, useProtocolDestroyMutation, Dose, CombinedModelRead, CompoundRead, ProjectRead, UnitRead, VariableRead, DoseRead } from "../../app/backendApi";
import useDirty from "../../hooks/useDirty";
import { FormData } from "./Model";

interface Props {
  project: ProjectRead;
  compound: CompoundRead;
  model: CombinedModelRead;
  variable: VariableRead;
  control: Control<FormData>;
  effectVariable: VariableRead | undefined;
  units: UnitRead[];
  timeVariable: VariableRead | undefined;
}

const derivedVariableRegex = /calc_.*_(f|bl|RO)/;


const VariableRow: React.FC<Props> = ({ project, compound, model, variable, control, effectVariable, units, timeVariable }) => {

  const { fields: mappings, append: appendMapping, remove: removeMapping } = useFieldArray({
      control,
      name: "model.mappings",
  });
  const { fields: derivedVariables, append: derivedVariablesAppend, remove: derivedVariablesRemove } = useFieldArray({
      control,
      name: "model.derived_variables",
  });

  const { control: controlVariable, handleSubmit, reset, setValue, formState: { isDirty: isDirtyForm }, watch} = useForm<Variable>(
    { defaultValues: variable || { id: 0, name: ''}}
  );
  const [updateVariable] = useVariableUpdateMutation();
  const [createProtocol] = useProtocolCreateMutation();
  const [destroyProtocol] = useProtocolDestroyMutation();

  const defaultTimeUnit = timeVariable ? units?.find(u => u.id === timeVariable.unit) : units?.find((unit) => unit.symbol === 'h');

  useEffect(() => {
    reset(variable);
  }, [variable, reset]);

  const watchProtocolId = watch('protocol');
  const isDirty = watchProtocolId !== variable?.protocol || isDirtyForm;
  useDirty(isDirty);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isDirty) {
        handleSubmit((data) => {
          // @ts-expect-error
          if (data.lower_bound === '') {
            data.lower_bound = null;
          }
          // @ts-expect-error
          if (data.upper_bound === '') {
            data.upper_bound = null;
          }
          console.log('updateVariable', data)
          updateVariable({ id: variable.id, variable: data });
        })();
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [handleSubmit, isDirty, updateVariable]);
 
  if (variable.constant || variable.name === 't' || variable.name === 'C_Drug') {
    return (null);
  }

  const concentrationUnit = units.find((unit) => unit.symbol === "pmol/L");
  const isClinical = project.species === 'H';
  const amountUnit = units.find((unit) => unit.symbol === (isClinical ? "pmol" : "pmol/kg"));
  const variableUnit = units.find((unit) => unit.id === variable.unit);
  if (concentrationUnit === undefined || amountUnit === undefined) {
    return (<>No concentration or amount unit found</>);
  }

  const isPD = variable.qname.startsWith("PD");
  const hasProtocol: boolean = watchProtocolId != null;
  const linkToPD = isPD ? false : mappings.find((mapping) => mapping.pk_variable === variable.id) !== undefined;
  const isConcentration = concentrationUnit?.compatible_units.find((unit) => parseInt(unit.id) === variable.unit) !== undefined;
  const isAmount = variableUnit?.symbol != '' && amountUnit?.compatible_units.find((unit) => parseInt(unit.id) === variable.unit) !== undefined;

  const addProtocol = () => {
    const isPerKg = variableUnit?.g !== 0;
    const amountUnitSymbol = isPerKg ? "mg/kg" : "mg";
    const amountUnit = units.find((unit) => unit.symbol === amountUnitSymbol);
    const defaultDose: DoseRead = { id: 0, amount: 1, start_time: 0, repeat_interval: 1, repeats: 1, duration: 0.0833 };
    createProtocol({ protocol: { doses: [ defaultDose ], amount_unit: amountUnit?.id || variable.unit, time_unit: defaultTimeUnit?.id || undefined, name: variable.name, project: project.id } })
    .then((value) => {
      if ('data' in value) {
        setValue("protocol", value.data.id ) 
        updateVariable({ id: variable.id, variable: { ...variable, protocol: value.data.id }})
      }
    });
  };

  const removeProtocol = () => {
    if (hasProtocol && watchProtocolId) {
      destroyProtocol({ id: watchProtocolId }).then((value) => 'data' in value && setValue("protocol", null) );
    }
  };

  const addPDMapping = () => {
    if (effectVariable) {
      if (mappings.length > 0) {
        removeMapping(0);
      }
      appendMapping({ pk_variable: variable.id, pd_variable: effectVariable.id, pkpd_model: model.id });
    }
  };

  const removePDMapping = () => {
    const mapping_index = mappings.findIndex((mapping) => mapping.pk_variable === variable.id);
    if (mapping_index >= 0) {
      removeMapping(mapping_index);
    }
  };

  const addDerived = (type: 'RO' | 'FUP' | 'BPR' | "TLG") => {
    console.log('addDerived', type)
    // can only be one 'FUP' and one 'BPR' across all variables
    const sameType = derivedVariables
      .map((d, i) => ({...d, index: i }))
      .filter((ro) => ro.type === type)
      .map((ro) => ro.index);

    const onlyOne = type === 'FUP' || type === 'BPR';
    if (onlyOne && sameType.length > 0) {
      removeDerived(sameType);
    }
    
    derivedVariablesAppend({ pk_variable: variable.id, pkpd_model: model.id, type });
  };

  const removeDerived = (index: number | number[]) => {
    derivedVariablesRemove(index);
  };

  const onClickDerived = (type: 'RO' | 'FUP' | 'BPR' | "TLG") => () => {
    console.log('onClickDerived', type)
    const index = derivedIndex(type);
    return index >= 0 ? removeDerived(index) : addDerived(type)
  };

  const derivedIndex = (type: 'RO' | 'FUP' | 'BPR' | "TLG") => {
    return derivedVariables.findIndex((ro) => ro.pk_variable === variable.id && ro.type === type);
  };

  const isLinkedTo = (type: 'RO' | 'FUP' | 'BPR' | "TLG") => {
    return derivedIndex(type) >= 0;
  };


  const noMapToPD = isPD || effectVariable === undefined || !isConcentration
  const noDerivedVariables =  !isConcentration || isPD;
  const isC1 = model.is_library_model && variable.qname.endsWith('.C1')
  const disableRo = !compound.dissociation_constant || !compound.target_concentration;
  const disableFUP = !compound.fraction_unbound_plasma || compound.compound_type === 'LM';
  const disableBPR = !compound.blood_to_plasma_ratio || compound.compound_type === 'LM';
  const noDosing = !isAmount;

  const isDerivedVariable = variable.name.match(derivedVariableRegex) !== null; 

  if (noMapToPD && noDerivedVariables && noDosing) {
    return (null);
  }

  const modelHaveTLag = model.has_lag;

  return (
    <TableRow>
      <TableCell>
        <Tooltip title={variable.description}>
          <Typography>
            {variable.name}
          </Typography>
        </Tooltip>
      </TableCell>
      <TableCell>
        {variableUnit?.symbol}
      </TableCell>
      <TableCell>
        {isPD ? "PD" : "PK"}
      </TableCell>
      <TableCell>
        { !noDosing && (
        <FormControlLabel control={<MuiCheckbox checked={hasProtocol} onClick={() => hasProtocol ? removeProtocol() : addProtocol()} data-cy={`checkbox-dosing-${variable.name}`} />} label="" />
        )}
      </TableCell>
      { modelHaveTLag && (
      <TableCell>
        { !noDosing && (
        <FormControlLabel control={<MuiCheckbox checked={isLinkedTo('TLG')} onClick={onClickDerived('TLG')} data-cy={`checkbox-tlag-${variable.name}`} />} label="" />
        )}
      </TableCell>
      )}
      <TableCell>
        { !noMapToPD && (
        <FormControlLabel control={<Radio checked={linkToPD} onClick={() => linkToPD ? removePDMapping() : addPDMapping()} data-cy={`checkbox-map-to-pd-${variable.name}`}/>} label="" />
        )}
      </TableCell>
      <TableCell>
        { !noDerivedVariables && !isDerivedVariable && (
        <FormControlLabel disabled={disableRo} control={<MuiCheckbox checked={isLinkedTo('RO')} onClick={onClickDerived('RO')} />} label="" />
        )}
      </TableCell>
      <TableCell>
        { isC1 && !noDerivedVariables && !isDerivedVariable && (
        <FormControlLabel disabled={disableFUP} control={<Radio checked={isLinkedTo('FUP')} onClick={onClickDerived('FUP')} />} label="" />
        )}
      </TableCell>
      <TableCell>
        { isC1 && !noDerivedVariables && !isDerivedVariable && (
        <FormControlLabel disabled={disableBPR} control={<Radio checked={isLinkedTo('BPR')} onClick={onClickDerived('BPR')} />} label="" />
        )}
      </TableCell>
    </TableRow>
  );
}

export default VariableRow;
