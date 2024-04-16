import { FC, useEffect, useMemo } from "react";
import { TableCell, TableRow, IconButton, Button, Stack, Typography } from "@mui/material";
import {
  ProjectRead,
  Protocol,
  ProtocolRead,
  UnitRead,
  useCompoundRetrieveQuery,
  useProtocolUpdateMutation,
  useVariableRetrieveQuery,
} from "../../app/backendApi";
import { Delete } from "@mui/icons-material";
import { useFieldArray, useForm } from "react-hook-form";
import UnitField from "../../components/UnitField";
import FloatField from "../../components/FloatField";
import IntegerField from "../../components/IntegerField";
import useDirty from "../../hooks/useDirty";
import useInterval from '../../hooks/useInterval';
import HelpButton from "../../components/HelpButton";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { selectIsProjectShared } from "../login/loginSlice";

interface Props {
  onChange: () => void;
  project: ProjectRead;
  protocol: ProtocolRead;
  units: UnitRead[];
}

const Doses: FC<Props> = ({ onChange, project, protocol, units }) => {
  const { data: compound } =
    useCompoundRetrieveQuery(
      { id: project?.compound || 0 },
      { skip: !project || !project.compound },
    );
  const { data: variable, isLoading: isVariableLoading } =
    useVariableRetrieveQuery(
      { id: protocol.variables[0] || 0 },
      { skip: !protocol.variables.length },
    );
  const mappedVariable = protocol.mapped_qname || variable?.qname || '';
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

  const handleSave = useMemo(() => handleSubmit(async (data: Protocol) => {
    if (JSON.stringify(data) !== JSON.stringify(protocol)) {
      await updateProtocol({ id: protocol.id, protocol: data });
      onChange();
    }
  }), [handleSubmit, onChange, protocol, updateProtocol]);

  // save protocol every second if dirty
  useInterval({
    callback: handleSave,
    delay: 1000,
    isDirty
  });

  const isPreclinical = project.species !== "H";
  const defaultProps = {
    disabled: isSharedWithMe,
  }
  const defaultSymbol = isPreclinical ? "mg/kg" : "mg";
  const defaultUnit = units.find((u) => u.symbol === defaultSymbol);
  const baseUnit = units.find((u) => u.id === protocol.amount_unit);

  useEffect(() => {
    // set default amount unit to mg/kg or mg, if not set already.
    async function setDefaultAmountUnit() {
      const newProtocol = { ...protocol, amount_unit: defaultUnit?.id };
      await updateProtocol({ id: protocol.id, protocol: newProtocol });
      onChange();
    }
    if (defaultUnit?.id && baseUnit?.symbol === '') {
      setDefaultAmountUnit();
    }
  }, [defaultUnit?.id, baseUnit?.symbol, protocol, updateProtocol, onChange])

  if (isVariableLoading) {
    return <div>Loading...</div>;
  }

  const handleAddRow = () => {
    const isSmallMolecule = compound?.compound_type === "SM";
    appendDose({
      amount: 0,
      duration: 0.0833,
      repeats: 1,
      start_time: 0,
      repeat_interval: isSmallMolecule ? 24 : 168,
    });
  };

  const handleDeleteRow = (index: number) => {
    removeDose(index);
  };

  return (
    <>
      {doses.map((dose, index) => (
        <TableRow key={dose.id}>
          <TableCell>{mappedVariable}</TableCell>
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
                baseUnit={baseUnit}
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
