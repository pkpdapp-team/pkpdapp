import { FC, useEffect, useMemo } from "react";
import {
  TableCell,
  TableRow,
  IconButton,
  Button,
  Stack,
  Typography,
  Box,
  Tooltip,
} from "@mui/material";
import {
  ProjectRead,
  Protocol,
  ProtocolRead,
  UnitRead,
  useCompoundRetrieveQuery,
  useProtocolUpdateMutation,
  useVariableRetrieveQuery,
} from "../../app/backendApi";
import Delete from "@mui/icons-material/Delete";
import { useFieldArray, useForm } from "react-hook-form";
import UnitField from "../../components/UnitField";
import FloatField from "../../components/FloatField";
import IntegerField from "../../components/IntegerField";
import useDirty from "../../hooks/useDirty";
import useInterval from "../../hooks/useInterval";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { selectIsProjectShared } from "../login/loginSlice";
import { TableHeader } from "../../components/TableHeader";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

interface Props {
  onChange: () => void;
  project: ProjectRead;
  protocol: ProtocolRead;
  units: UnitRead[];
}

const Doses: FC<Props> = ({ onChange, project, protocol, units }) => {
  const { data: compound } = useCompoundRetrieveQuery(
    { id: project?.compound || 0 },
    { skip: !project || !project.compound },
  );
  const { data: variable, isLoading: isVariableLoading } =
    useVariableRetrieveQuery(
      { id: protocol.variables[0] || 0 },
      { skip: !protocol.variables.length },
    );
  const mappedVariable = protocol.mapped_qname || variable?.qname || "";
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
    getValues,
  } = useForm<Protocol>({
    defaultValues: protocol,
  });
  useDirty(isDirty);
  const [updateProtocol] = useProtocolUpdateMutation();
  const isSharedWithMe = useSelector((state: RootState) =>
    selectIsProjectShared(state, project),
  );

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

  const handleSave = useMemo(
    () =>
      handleSubmit(async (data: Protocol) => {
        if (JSON.stringify(data) !== JSON.stringify(protocol)) {
          await updateProtocol({ id: protocol.id, protocol: data });
          onChange();
        }
      }),
    [handleSubmit, onChange, protocol, updateProtocol],
  );

  // save protocol every second if dirty
  useInterval({
    callback: handleSave,
    delay: 1000,
    isDirty,
  });

  const isPreclinical = project.species !== "H";
  const defaultProps = {
    disabled: isSharedWithMe,
  };
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
    if (defaultUnit?.id && baseUnit?.symbol === "") {
      setDefaultAmountUnit();
    }
  }, [defaultUnit?.id, baseUnit?.symbol, protocol, updateProtocol, onChange]);

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

  const selectedAmountId = getValues("amount_unit");
  const selectedAmountLabel =
    baseUnit?.compatible_units?.find(({ id }) => +id === selectedAmountId)
      ?.symbol || "";

  const protocolName = mappedVariable.split(".").pop();

  return (
    <>
      <TableRow>
        <TableCell colSpan={8} sx={{ height: "2rem", padding: "5px" }}>
          <Box
            sx={{
              paddingLeft: "16px",
              display: "flex",
              textWrap: "nowrap",
              alignItems: "center",
            }}
          >
            <TableHeader
              variant="subtitle1"
              label={`${protocolName} Administration`}
              tooltip="Defines the site of drug administration. A1/A1_t/A1_f =
                      IV, Aa = SC or PO. The site of drug administration can be
                      selected under Model/ Map Variables"
            />{" "}
            <Stack
              sx={{ paddingLeft: "1rem", alignItems: "center" }}
              direction="row"
              width="max-content"
            >
              <Button
                size="small"
                onClick={handleAddRow}
                variant="contained"
                sx={{
                  width: "fit-content",
                  textWrap: "nowrap",
                  height: "2rem",
                }}
                disabled={false}
              >
                Add New Row
              </Button>
              <Tooltip
                title="Adding an additional dosing line allows defining complex dosing
                regimens (e.g. changing dosing frequency and/or dosing levels)"
                arrow
                placement="right"
                PopperProps={{ sx: { marginLeft: "4px" } }}
              >
                <HelpOutlineIcon
                  sx={{
                    marginLeft: "8px",
                    color: "dimgray",
                    transform: "scale(0.85)",
                  }}
                />
              </Tooltip>
            </Stack>
          </Box>
        </TableCell>
      </TableRow>
      {doses.map((dose, index) => (
        <TableRow key={dose.id}>
          <TableCell>
            <FloatField
              sx={{ minWidth: "6rem" }}
              size="small"
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
            {protocol.amount_unit && index === 0 ? (
              <UnitField
                size="small"
                label={"Unit"}
                name={`amount_unit`}
                control={control}
                baseUnit={baseUnit}
                isPreclinicalPerKg={isPreclinical}
                selectProps={defaultProps}
              />
            ) : (
              <Typography>{selectedAmountLabel}</Typography>
            )}
          </TableCell>
          <TableCell>
            <IntegerField
              size="small"
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
              size="small"
              label="Start Time"
              name={`doses.${index}.start_time`}
              control={control}
              rules={{ required: true }}
              textFieldProps={defaultProps}
            />
          </TableCell>
          <TableCell>
            <FloatField
              size="small"
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
              size="small"
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
            <Typography>
              {units.find((u) => u.id === protocol.time_unit)?.symbol}
            </Typography>
          </TableCell>
          <TableCell align="center">
            {index !== 0 && (
              <IconButton
                onClick={() => handleDeleteRow(index)}
                disabled={isSharedWithMe}
              >
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
