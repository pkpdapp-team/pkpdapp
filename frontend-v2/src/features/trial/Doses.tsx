import React, { useEffect } from "react";
import {
  TableCell,
  TableRow,
  IconButton,
} from "@mui/material";
import { Project, Protocol, Unit, useProtocolUpdateMutation, useVariableRetrieveQuery } from "../../app/backendApi";
import { Add, Delete } from "@mui/icons-material";
import { useFieldArray, useForm } from "react-hook-form";
import TextField from "../../components/TextField";
import UnitField from "../../components/UnitField";
import FloatField from "../../components/FloatField";
import IntegerField from "../../components/IntegerField";
import useDirty from "../../hooks/useDirty";

interface Props {
    project: Project;
    protocol: Protocol;
    units: Unit[];
}

const Doses: React.FC<Props> = ({ project, protocol, units }) => {
  const { data: variable, error: variableError, isLoading: isVariableLoading } = useVariableRetrieveQuery({id: protocol.variables[0] || 0})
  const { control, handleSubmit, reset, formState: { isDirty } } = useForm<Protocol>({
    defaultValues: protocol,
  });
  useDirty(isDirty);
  const [ updateProtocol ] = useProtocolUpdateMutation();

  const { fields: doses, append: appendDose, remove: removeDose } = useFieldArray({
    control,
    name: "doses",
  });

  useEffect(() => {
    reset(protocol);
  }, [protocol, reset]);

  // save protocol every second if dirty
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isDirty) {
        console.log('saving protocol')
        handleSubmit((data) => updateProtocol({ id: data.id, protocol: data }))();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [handleSubmit, isDirty, updateProtocol]);
  
  if (isVariableLoading) {
    return <div>Loading...</div>;
  }

  if (!variable) {
    return <div>Variable not found</div>;
  }

  const handleAddRow = () => {
    appendDose({ id: 0, amount: 0, repeats: 0, start_time: 0, repeat_interval: 0 });
  }

  const handleDeleteRow = (index: number) => {
    removeDose(index);
  }

  return (
    <>
      {doses.map((dose, index) => (
        <TableRow key={dose.id}>
          <TableCell>
            {variable.name}
          </TableCell>
          <TableCell>
            <FloatField label={"Dose"} name={`doses.${index}.amount`} control={control} rules={{ required: true }} />
          </TableCell>
          <TableCell>
            { protocol.amount_unit && index === 0 && (
              <UnitField label={"Unit"} name={`amount_unit`} control={control} baseUnitId={protocol.amount_unit} />
            )}
          </TableCell>
          <TableCell>
            <IntegerField label={"Number of Doses"} name={`doses.${index}.repeats`} control={control} rules={{ required: true, min: { value: 1, message: "One or more required"} }} />
          </TableCell>
          <TableCell>
            <FloatField label={index === 0 ? "Start Time" : "Time After Last Dose"} name={`doses.${index}.start_time`} control={control} rules={{ required: true }} />
          </TableCell>
          <TableCell>
            <FloatField label={"Dosing Duration"} name={`doses.${index}.duration`} control={control} rules={{ required: true, min: { value: Number.EPSILON, message: "Must be greater than 0"} }} />
          </TableCell>
          <TableCell>
            <FloatField label={"Dosing Interval"} name={`doses.${index}.repeat_interval`} control={control} rules={{ required: true }} />
          </TableCell>
          <TableCell>
            { protocol.time_unit && index === 0 && (
              <UnitField label={"Time Unit"} name={`time_unit`} control={control} baseUnitId={protocol.time_unit} />
            )}
          </TableCell>
          <TableCell align="right">
            { index === 0 ? (
              <IconButton onClick={handleAddRow}>
              <Add />
              </IconButton>
            ) : (
              <IconButton onClick={() => handleDeleteRow(index)}>
              <Delete />
              </IconButton>

            )}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
};

export default Doses;
