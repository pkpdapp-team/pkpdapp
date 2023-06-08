// src/components/ProjectTable.tsx
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  TableCell,
  TableRow,
  Checkbox as MuiCheckbox,
  FormControlLabel,
  Tooltip,
  Typography,
} from "@mui/material";
import { Project, PkpdMapping, useVariableRetrieveQuery, CombinedModel, Variable, useVariableUpdateMutation, useProtocolCreateMutation, useProtocolDestroyMutation, Dose, useUnitListQuery } from "../../app/backendApi";
import Checkbox from "../../components/Checkbox";

interface Props {
  project: Project;
  model: CombinedModel;
  variableId: number;
  mappings: PkpdMapping[];
  appendMapping: (value: PkpdMapping) => void;
  removeMapping: (index: number) => void;
}


const VariableRow: React.FC<Props> = ({ project, model, variableId, appendMapping, removeMapping, mappings }) => {

  const { data: variable, isLoading } = useVariableRetrieveQuery({id: variableId});
  const { data: units } = useUnitListQuery();
  const { control, handleSubmit, reset, setValue, formState: { isDirty: isDirtyForm }, watch} = useForm<Variable>(
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
 
  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (!variable) {
    return <div>Variable not found</div>;
  }

  if (variable.state !== true) {
    return (null);
  }


  const isPD = variable.qname.startsWith("PD");
  const hasProtocol: boolean = watchProtocolId != null;
  const linkToPD = isPD ? false : mappings.find((mapping) => mapping.pd_variable === variable.id) !== undefined;

  const addProtocol = () => {
    const defaultDose: Dose = { id: 0, amount: 0, start_time: 0, repeat_interval: 0, repeats: 0 };
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
    appendMapping({ id: 0, pk_variable: variable.id, pd_variable: 0, pkpd_model: model.id, datetime: '', read_only: false });
  };

  const removePDMapping = () => {
    const mapping_index = mappings.findIndex((mapping) => mapping.pk_variable === variable.id);
    if (mapping_index >= 0) {
      removeMapping(mapping_index);
    }
  };


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
        {isPD ? "PD" : "PK"}
      </TableCell>
      <TableCell>
        <FormControlLabel control={<MuiCheckbox checked={hasProtocol} onClick={() => hasProtocol ? removeProtocol() : addProtocol()} />} label="Dosing" />
      </TableCell>
      <TableCell>
        <FormControlLabel control={<MuiCheckbox checked={linkToPD} onClick={() => linkToPD ? removePDMapping() : addPDMapping()} />} label="Map to PD Effect" />
      </TableCell>
      <TableCell>
        <Checkbox name="link_to_ro" control={control} label="Link to RO" />
      </TableCell>
    </TableRow>
  );
}

export default VariableRow;
