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

interface Props {
  project: Project;
  compound: Compound;
  model: CombinedModel;
  variable: Variable;
  control: Control<CombinedModel>;
  effectVariable: Variable | undefined;
  units: Unit[];
}


const VariableRow: React.FC<Props> = ({ project, compound, model, variable, control, effectVariable, units }) => {

  const { fields: mappings, append: appendMapping, remove: removeMapping } = useFieldArray({
      control,
      name: "mappings",
  });
  const { fields: receptorOccupancies, append: receptorOccupancyAppend, remove: receptorOccupancyRemove } = useFieldArray({
      control,
      name: "receptor_occupancies",
  });

  const { control: controlVariable, handleSubmit, reset, setValue, formState: { isDirty: isDirtyForm }, watch} = useForm<Variable>(
    { defaultValues: variable || { id: 0, name: ''}}
  );
  const [updateVariable] = useVariableUpdateMutation();
  const [createProtocol] = useProtocolCreateMutation();
  const [destroyProtocol] = useProtocolDestroyMutation();

  const defaultTimeUnit = units?.find((unit) => unit.symbol === 'h');

  useEffect(() => {
    reset(variable);
  }, [variable, reset]);

  const watchProtocolId = watch('protocol');
  const isDirty = watchProtocolId !== variable?.protocol || isDirtyForm;

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
  const linkToRO = receptorOccupancies.find((ro) => ro.pk_variable === variable.id) !== undefined;
  const isConcentration = concentrationUnit?.compatible_units.find((unit) => parseInt(unit.id) === variable.unit) !== undefined;
  const isAmount = amountUnit?.compatible_units.find((unit) => parseInt(unit.id) === variable.unit) !== undefined;

  const addProtocol = () => {
    const defaultDose: Dose = { id: 0, amount: 0, start_time: 0, repeat_interval: 1, repeats: 0 };
    createProtocol({ protocol: { id: 0, dataset: '', doses: [ defaultDose ], amount_unit: variable.unit, time_unit: defaultTimeUnit?.id || undefined, subjects: [], name: variable.name, project: project.id, variables: [] } })
    .then((value) => {
      if ('data' in value) {
        setValue("protocol", value.data.id ) 
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

  const addRO = () => {
    receptorOccupancyAppend({ id: 0, pk_variable: variable.id, pkpd_model: model.id });
  };

  const removeRO = () => {
    const ro_index = receptorOccupancies.findIndex((ro) => ro.pk_variable === variable.id);
    if (ro_index >= 0) {
      receptorOccupancyRemove(ro_index);
    }
  };

  const noMapToPD = isPD || effectVariable === undefined || !isConcentration
  const noRO =  !isConcentration || isPD;
  const disableRo = !compound.dissociation_constant || !compound.target_concentration;
  const noDosing = !isAmount;


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
        <FormControlLabel control={<MuiCheckbox checked={hasProtocol} onClick={() => hasProtocol ? removeProtocol() : addProtocol()} />} label="Dosing" />
        )}
      </TableCell>
      <TableCell>
        { !noMapToPD && (
        <FormControlLabel control={<MuiCheckbox checked={linkToPD} onClick={() => linkToPD ? removePDMapping() : addPDMapping()} />} label="Map to PD Effect" />
        )}
      </TableCell>
      <TableCell>
        { !noRO && (
        <FormControlLabel disabled={disableRo} control={<MuiCheckbox checked={linkToRO} onClick={() => linkToRO ? removeRO() : addRO()} />} label="Link to RO" />
        )}
      </TableCell>
    </TableRow>
  );
}

export default VariableRow;
