import { FC, useEffect } from "react";
import {
  TableCell,
  TableRow,
  Button,
  Stack,
  Box,
  Tooltip,
} from "@mui/material";
import {
  ProjectRead,
  Protocol,
  ProtocolRead,
  UnitRead,
  useDoseCreateMutation,
  useProtocolUpdateMutation,
  useVariableRetrieveQuery,
} from "../../app/backendApi";
import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { selectIsProjectShared } from "../login/loginSlice";
import { TableHeader } from "../../components/TableHeader";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import DoseRow from "./DoseRow";

interface Props {
  onChange: () => void;
  project: ProjectRead;
  protocol: ProtocolRead;
  units: UnitRead[];
}

const Doses: FC<Props> = ({ onChange, project, protocol, units }) => {
  const { data: variable, isLoading: isVariableLoading } =
    useVariableRetrieveQuery(
      { id: protocol.variables[0] || 0 },
      { skip: !protocol.variables.length },
    );
  const mappedVariable = protocol.mapped_qname || variable?.qname || "";
  const { control } = useForm<Protocol>({
    defaultValues: protocol,
  });
  const [updateProtocol] = useProtocolUpdateMutation();
  const [createDose] = useDoseCreateMutation();
  const isSharedWithMe = useSelector((state: RootState) =>
    selectIsProjectShared(state, project),
  );

  const sortedDoses = [...protocol.doses].sort((a, b) => a.id - b.id);

  const isPreclinical = project.species !== "H";
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

  const handleAddRow = async () => {
    const lastDose = sortedDoses[sortedDoses.length - 1];
    const increment =
      lastDose.repeats && lastDose.repeats > 1
        ? (lastDose.repeat_interval || 1) * lastDose.repeats
        : lastDose.duration || 1;
    const lastDoseEndTime = lastDose.start_time + increment;
    await createDose({
      dose: {
        amount: lastDose.amount,
        duration: lastDose.duration,
        repeats: lastDose.repeats,
        start_time: lastDoseEndTime,
        repeat_interval: lastDose.repeat_interval,
        protocol: protocol.id,
      },
    });
    onChange();
  };

  const selectedAmountId = protocol.amount_unit;
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
                disabled={isSharedWithMe}
              >
                Add New Row
              </Button>
              <Tooltip
                title="Adding an additional dosing line allows defining complex dosing
                regimens (e.g. changing dosing frequency and/or dosing levels)"
                arrow
                placement="right"
                slotProps={{
                  popper: { sx: { marginLeft: "4px" } },
                }}
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
      {sortedDoses.map((dose, index) => (
        <DoseRow
          key={dose.id}
          index={index}
          baseUnit={baseUnit}
          disabled={isSharedWithMe}
          doseId={dose.id}
          control={control}
          isPreclinical={isPreclinical}
          minStartTime={
            sortedDoses[index - 1]?.start_time + 1e4 * Number.EPSILON || 0
          }
          onChange={onChange}
          selectedAmountLabel={selectedAmountLabel}
          timeUnit={units.find((u) => u.id === protocol.time_unit)}
        />
      ))}
    </>
  );
};

export default Doses;
