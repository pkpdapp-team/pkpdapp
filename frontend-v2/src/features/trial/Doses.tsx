import { FC, useEffect } from "react";
import { TableCell, TableRow, IconButton, Button, Stack, Typography } from "@mui/material";
import {
  ProjectRead,
  Protocol,
  ProtocolRead,
  UnitRead,
  useProtocolUpdateMutation,
  useVariableRetrieveQuery,
} from "../../app/backendApi";
import { Delete } from "@mui/icons-material";
import { useFieldArray, useForm } from "react-hook-form";
import UnitField from "../../components/UnitField";
import FloatField from "../../components/FloatField";
import IntegerField from "../../components/IntegerField";
import useDirty from "../../hooks/useDirty";
import HelpButton from "../../components/HelpButton";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { selectIsProjectShared } from "../login/loginSlice";

interface Props {
  project: ProjectRead;
  protocol: ProtocolRead;
  units: UnitRead[];
}

const Doses: FC<Props> = ({ project, protocol, units }) => {
  const { data: variable, isLoading: isVariableLoading } =
    useVariableRetrieveQuery(
      { id: protocol.variables[0] || 0 },
      { skip: !protocol.variables.length },
    );
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<Protocol>({
    defaultValues: protocol,
  });
  useDirty(isDirty);
  const [updateProtocol] = useProtocolUpdateMutation();
  const isSharedWithMe = useSelector((state: RootState) => selectIsProjectShared(state, project));

  const {
    fields: doses,
    append: appendDose,
    remove: removeDose,
  } = useFieldArray({
    control,
    name: "doses",
  });

  useEffect(() => {
    reset(protocol);
  }, [protocol, reset]);

  const handleSave = handleSubmit((data: Protocol) => {
    if (JSON.stringify(data) !== JSON.stringify(protocol)) {
      updateProtocol({ id: protocol.id, protocol: data });
    }
  });

  // save protocol every second if dirty
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isDirty) {
        handleSave();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [handleSave, isDirty]);

  useEffect(
    () => () => {
      handleSave();
    },
    [],
  );

  if (isVariableLoading) {
    return <div>Loading...</div>;
  }

  if (!variable) {
    return <div>Variable not found</div>;
  }

  const handleAddRow = () => {
    appendDose({ amount: 0, repeats: 0, start_time: 0, repeat_interval: 1 });
  };

  const handleDeleteRow = (index: number) => {
    removeDose(index);
  };

  const isPreclinical = project.species !== "H";
  const defaultProps = {
    disabled: isSharedWithMe,
  }

  return (
    <>
      {doses.map((dose, index) => (
        <TableRow key={dose.id}>
          <TableCell>{variable.name}</TableCell>
          <TableCell>
            <FloatField
              label={"Dose"}
              name={`doses.${index}.amount`}
              control={control}
              rules={{
                required: true,
                min: { value: 0, message: "Must be greater or equal to 0" },
              }}
              textFieldProps={defaultProps}
            />
          </TableCell>
          <TableCell>
            {protocol.amount_unit && index === 0 && (
              <UnitField
                label={"Unit"}
                name={`amount_unit`}
                control={control}
                baseUnit={units.find((u) => u.id === protocol.amount_unit)}
                isPreclinicalPerKg={isPreclinical}
                selectProps={defaultProps}
              />
            )}
          </TableCell>
          <TableCell>
            <IntegerField
              label={"Number of Doses"}
              name={`doses.${index}.repeats`}
              control={control}
              rules={{
                required: true,
                min: { value: 1, message: "One or more required" },
              }}
              textFieldProps={defaultProps}
            />
          </TableCell>
          <TableCell>
            <FloatField
              label={index === 0 ? "Start Time" : "Time After Last Dose"}
              name={`doses.${index}.start_time`}
              control={control}
              rules={{ required: true }}
              textFieldProps={defaultProps}
            />
          </TableCell>
          <TableCell>
            <FloatField
              label={"Dosing Duration"}
              name={`doses.${index}.duration`}
              control={control}
              rules={{
                required: true,
                min: {
                  value: Number.EPSILON,
                  message: "Must be greater than 0",
                },
              }}
              textFieldProps={defaultProps}
            />
          </TableCell>
          <TableCell>
            <FloatField
              label={"Dosing Interval"}
              name={`doses.${index}.repeat_interval`}
              control={control}
              rules={{
                required: true,
                min: {
                  value: Number.EPSILON,
                  message: "Must be greater than 0",
                },
              }}
              textFieldProps={defaultProps}
            />
          </TableCell>
          <TableCell>
            {protocol.time_unit && index === 0 && (
              <Typography>
                {units.find((u) => u.id === protocol.time_unit)?.symbol}
              </Typography>
            )}
          </TableCell>
          <TableCell align="center">
            {index !== 0 && (
              <IconButton onClick={() => handleDeleteRow(index)} disabled={isSharedWithMe}>
                <Delete />
              </IconButton>
            )}
          </TableCell>
        </TableRow>
      ))}
      <Stack direction='row' width='max-content'>
        <Button
          onClick={handleAddRow}
          variant="outlined"
          sx={{ fontSize: ".5rem" }}
          disabled={isSharedWithMe}
        >
          Add New Row
        </Button>
        <HelpButton title="Add Dose Line">
          Adding an additional dosing line allows defining complex dosing
          regimens (e.g. changing dosing frequency and/or dosing levels)
        </HelpButton>
      </Stack>
    </>
  );
};

export default Doses;
