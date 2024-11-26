import { useContext } from "react";

import { SimulationContext } from "../../contexts/SimulationContext";

import { FilterIndex, RowData } from "./ResultsTab";
import { useConcentrationVariables } from "./useConcentrationVariables";
import { useParameters } from "./useParameters";
import { useVariables } from "./useVariables";
import { tableRow } from "./utils";
import { useModelTimeIntervals } from "../../hooks/useModelTimeIntervals";
import { useUnits } from "./useUnits";

interface TableRowsProps {
  rows: RowData;
  groupIndex: FilterIndex;
  intervalIndex: FilterIndex;
  variableIndex: FilterIndex;
  parameterIndex: FilterIndex;
  concentrationUnit?: string;
  timeUnit?: string;
}
export function useTableRows({
  rows,
  groupIndex,
  intervalIndex,
  variableIndex,
  parameterIndex,
  concentrationUnit = "pmol/L",
  timeUnit = "h",
}: TableRowsProps) {
  const units = useUnits();
  const variables = useVariables();
  const parameters = useParameters({
    variableUnit: concentrationUnit,
    timeUnit,
  });
  const concentrationVariables = useConcentrationVariables();
  const { simulations } = useContext(SimulationContext);
  const [intervals] = useModelTimeIntervals();

  return rows.map((row, index) => {
    const rowUnit =
      "unit" in row ? units?.find((unit) => unit.id === row.unit) : undefined;
    const header =
      "start_time" in row && "end_time" in row
        ? `${row.start_time} – ${row.end_time} [${rowUnit?.symbol}]`
        : "name" in row
          ? row.name
          : "";
    const interval =
      intervalIndex === "columns"
        ? undefined
        : intervalIndex === "rows"
          ? intervals[index]
          : intervals[intervalIndex];
    const variable =
      variableIndex === "columns"
        ? undefined
        : variableIndex === "rows"
          ? concentrationVariables[index]
          : concentrationVariables[variableIndex];
    const simulation =
      groupIndex === "columns"
        ? undefined
        : groupIndex === "rows"
          ? simulations[index]
          : simulations[groupIndex];
    const parameter =
      parameterIndex === "columns"
        ? undefined
        : parameterIndex === "rows"
          ? parameters[index]
          : parameters[parameterIndex];
    return tableRow({
      header,
      variables,
      interval,
      intervals,
      variable,
      concentrationVariables,
      parameter,
      parameters,
      simulation,
      simulations,
    });
  });
}
