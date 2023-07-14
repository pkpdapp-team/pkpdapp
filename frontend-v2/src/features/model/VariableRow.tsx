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
} from "@mui/material";
import { Project, PkpdMapping, CombinedModel, Variable, useVariableUpdateMutation, useProtocolCreateMutation, useProtocolDestroyMutation, Dose, useUnitListQuery, Unit, Compound } from "../../app/backendApi";
import Checkbox from "../../components/Checkbox";
import useDirty from "../../hooks/useDirty";

interface Props {
  project: Project;
  compound: Compound;
  model: CombinedModel;
  variable: Variable;
  control: Control<CombinedModel>;
  effectVariable: Variable | undefined;
  units: Unit[];
  timeVariable: Variable | undefined;
}


const VariableRow: React.FC<Props> = ({ project, compound, model, variable, control, effectVariable, units, timeVariable }) => {

  const { fields: mappings, append: appendMapping, remove: removeMapping } = useFieldArray({
      control,
      name: "mappings",
  });
  const { fields: derivedVariables, append: derivedVariablesAppend, remove: derivedVariablesRemove } = useFieldArray({
      control,
      name: "derived_variables",
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
        handleSubmit((data) => updateVariable({ id: data.id, variable: data }))();
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [handleSubmit, isDirty, updateVariable]);
 
  if (variable.constant || variable.name === 't' || variable.name === 'C_Drug') {
    return (null);
  }

  const concentrationUnit = units.find((unit) => unit.symbol === "pmol/L");
  const amountUnit = units.find((unit) => unit.symbol === "pmol");
  const variableUnit = units.find((unit) => unit.id === variable.unit);
  if (concentrationUnit === undefined || amountUnit === undefined) {
    return (<>No concentration or amount unit found</>);
  }

  const isPD = variable.qname.startsWith("PD");
  const hasProtocol: boolean = watchProtocolId != null;
  const linkToPD = isPD ? false : mappings.find((mapping) => mapping.pk_variable === variable.id) !== undefined;
  const isConcentration = concentrationUnit?.compatible_units.find((unit) => parseInt(unit.id) === variable.unit) !== undefined;
  const isAmount = amountUnit?.compatible_units.find((unit) => parseInt(unit.id) === variable.unit) !== undefined;

  const addProtocol = () => {
    const defaultDose: Dose = { id: 0, amount: 0, start_time: 0, repeat_interval: 1, repeats: 1, duration: 0.833 };
    createProtocol({ protocol: { id: 0, dataset: '', doses: [ defaultDose ], amount_unit: variable.unit, time_unit: defaultTimeUnit?.id || undefined, subjects: [], name: variable.name, project: project.id, variables: [variable.id] } })
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
      appendMapping({ id: 0, pk_variable: variable.id, pd_variable: effectVariable.id, pkpd_model: model.id, datetime: '', read_only: false });
    }
  };

  const removePDMapping = () => {
    const mapping_index = mappings.findIndex((mapping) => mapping.pk_variable === variable.id);
    if (mapping_index >= 0) {
      removeMapping(mapping_index);
    }
  };

  const addDerived = (type: 'RO' | 'FUP' | 'BPR') => {
    derivedVariablesAppend({ id: 0, pk_variable: variable.id, pkpd_model: model.id, type });
  };

  const removeDerived = (index: number) => {
    derivedVariablesRemove(index);
  };

  const onClickDerived = (type: 'RO' | 'FUP' | 'BPR') => () => {
    const index = derivedIndex(type);
    return index >= 0 ? removeDerived(index) : addDerived(type)
  };

  const derivedIndex = (type: 'RO' | 'FUP' | 'BPR') => {
    return derivedVariables.findIndex((ro) => ro.pk_variable === variable.id && ro.type === type);
  };

  const isLinkedTo = (type: 'RO' | 'FUP' | 'BPR') => {
    return derivedIndex(type) >= 0;
  };


  const noMapToPD = isPD || effectVariable === undefined || !isConcentration
  const noRO =  !isConcentration || isPD;
  const disableRo = !compound.dissociation_constant || !compound.target_concentration;
  const noDosing = !isAmount;

  if (noMapToPD && noRO && noDosing) {
    return (null);
  }

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
        <FormControlLabel control={<MuiCheckbox checked={hasProtocol} onClick={() => hasProtocol ? removeProtocol() : addProtocol()} data-cy={`checkbox-dosing-${variable.name}`} />} label="Dosing" />
        )}
      </TableCell>
      <TableCell>
        { !noMapToPD && (
        <FormControlLabel control={<MuiCheckbox checked={linkToPD} onClick={() => linkToPD ? removePDMapping() : addPDMapping()} data-cy={`checkbox-map-to-pd-${variable.name}`}/>} label="Map to PD Effect" />
        )}
      </TableCell>
      <TableCell>
        { !noRO && (
        <FormControlLabel disabled={disableRo} control={<MuiCheckbox checked={isLinkedTo('RO')} onClick={onClickDerived('RO')} />} label="Link to RO" />
        )}
      </TableCell>
      <TableCell>
        { !noRO && (
        <FormControlLabel disabled={disableRo} control={<MuiCheckbox checked={isLinkedTo('FUP')} onClick={onClickDerived('FUP')} />} label="Link to FUP" />
        )}
      </TableCell>
      <TableCell>
        { !noRO && (
        <FormControlLabel disabled={disableRo} control={<MuiCheckbox checked={isLinkedTo('BPR')} onClick={onClickDerived('BPR')} />} label="Link to BPR" />
        )}
      </TableCell>
    </TableRow>
  );
}

export default VariableRow;
