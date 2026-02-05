import {
  SelectChangeEvent,
  TableRow,
  TableCell,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
} from "@mui/material";
import { FC, useState, ChangeEvent } from "react";
import {
  VariableRead,
  UnitRead,
  useVariableUpdateMutation,
  useVariableRetrieveQuery,
} from "../../../app/backendApi";
import { hasPerWeightOption } from "../../../shared/hasPerWeightOption";
import { useApiQueries } from "./MapObservations";
import { renameVariable } from "../../simulation/utils";

function displayUnitSymbol(symbol: string | undefined) {
  return symbol === "" ? "dimensionless" : symbol;
}

/**
 * Get all the time-varying variables for a model, excluding C_Drug and t.
 */
function useModelOutputs() {
  const { model, variables } = useApiQueries();
  const filterOutputs = model?.is_library_model
    ? ["environment.t", "PDCompartment.C_Drug"]
    : [];
  return (
    variables
      ?.filter(
        (variable) =>
          !variable.constant && !filterOutputs.includes(variable.qname),
      )
      .map((v) => renameVariable(v, model)) || []
  );
}

type ObservationIDRowProps = {
  obsId: string;
  obsVariable?: VariableRead;
  obsUnit?: UnitRead;
  handleObservationChange: (event: SelectChangeEvent) => void;
  handleUnitChange: (symbol: string) => void;
};

/**
 * An editable table row for a single observation ID (from the uploaded CSV.)
 */
export const ObservationIDRow: FC<ObservationIDRowProps> = ({
  obsId,
  obsVariable,
  obsUnit,
  handleObservationChange,
  handleUnitChange,
}) => {
  const { variables, units } = useApiQueries();
  const modelOutputs = useModelOutputs();
  const [updateVariable] = useVariableUpdateMutation();
  const [variable, setVariable] = useState(obsVariable);
  // refetch single variables, not the whole list.
  const { data: variableRead } = useVariableRetrieveQuery(
    {
      id: variable?.id || -1,
    },
    { skip: !variable?.id },
  );
  const selectedVariable = variableRead || variable;

  let selectedUnitSymbol = obsUnit?.symbol;
  const compatibleUnits = selectedVariable
    ? units?.find((unit) => unit.id === selectedVariable?.unit)
        ?.compatible_units
    : units;
  ["%", "fraction", "ratio"].forEach((token) => {
    if (selectedUnitSymbol?.toLowerCase().includes(token)) {
      selectedUnitSymbol = "";
    }
  });
  const hasPerKgUnits = hasPerWeightOption(obsUnit, obsVariable);
  const selectedPerBodyWeight =
    hasPerKgUnits && selectedVariable?.unit_per_body_weight;

  function onVariableChange(event: SelectChangeEvent) {
    const { value } = event.target;
    const nextVariable = variables?.find(
      (variable) => variable.qname === value,
    );
    if (!nextVariable) {
      handleObservationChange(event);
      setVariable(undefined);
      return;
    }
    let unit_per_body_weight = nextVariable.unit_per_body_weight || false;
    if (obsUnit?.symbol.endsWith("/kg")) {
      const baseUnitSymbol = obsUnit.symbol.replace("/kg", "");
      handleUnitChange(baseUnitSymbol);
      unit_per_body_weight = true;
    }
    setVariable({
      ...nextVariable,
      unit_per_body_weight,
    });
    handleObservationChange(event);
  }

  function onUnitChange(event: SelectChangeEvent) {
    const { value } = event.target;
    handleUnitChange(value);
  }

  function handlePerWeightChange(event: ChangeEvent<HTMLInputElement>) {
    if (!selectedVariable) {
      return;
    }
    const { checked } = event.target;
    updateVariable({
      id: selectedVariable.id,
      variable: {
        ...selectedVariable,
        unit_per_body_weight: checked,
      },
    });
    setVariable({
      ...selectedVariable,
      unit_per_body_weight: checked,
    });
  }

  return (
    <TableRow key={obsId}>
      <TableCell>{obsId}</TableCell>
      <TableCell>
        <FormControl fullWidth>
          <InputLabel size="small" id={`select-var-${obsId}-label`}>
            Variable
          </InputLabel>
          <Select
            labelId={`select-var-${obsId}-label`}
            id={`select-var-${obsId}`}
            label="Variable"
            value={selectedVariable?.qname || ""}
            onChange={onVariableChange}
            size="small"
            margin="dense"
          >
            <MenuItem value="">None</MenuItem>
            {modelOutputs?.map((variable) => (
              <MenuItem key={variable.name} value={variable.qname}>
                {variable.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </TableCell>
      <TableCell>
        <FormControl sx={{ width: "15rem" }}>
          <InputLabel size="small" id={`select-unit-${obsId}-label`}>
            Units
          </InputLabel>
          <Select
            labelId={`select-unit-${obsId}-label`}
            id={`select-unit-${obsId}`}
            label="Units"
            value={displayUnitSymbol(selectedUnitSymbol)}
            onChange={onUnitChange}
            size="small"
            margin="dense"
          >
            <MenuItem value="">None</MenuItem>
            {compatibleUnits?.map((unit) => (
              <MenuItem key={unit.id} value={displayUnitSymbol(unit.symbol)}>
                {displayUnitSymbol(unit.symbol)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </TableCell>
      <TableCell>
        <FormControl>
          <Checkbox
            checked={selectedPerBodyWeight}
            disabled={!hasPerKgUnits || !selectedVariable}
            onChange={handlePerWeightChange}
            slotProps={{
              input: {
                "aria-label": `Per Body Weight(kg) for ${selectedVariable?.name}`,
              },
            }}
          />
        </FormControl>
      </TableCell>
    </TableRow>
  );
};
