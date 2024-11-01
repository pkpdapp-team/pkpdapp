import { useContext } from "react";

import { SimulationContext } from "../../contexts/SimulationContext";
import { VariableRead } from "../../app/backendApi";

import { FilterIndex, RowData } from "./Results";
import { useConcentrationVariables } from "./useConcentrationVariables";
import { useParameters } from "./useParameters";
import { useVariables } from "./useVariables";
import { tableRow } from "./utils";

interface TableRowsProps {
  rows: RowData;
  groupIndex: FilterIndex;
  intervalIndex: FilterIndex;
  variableIndex: FilterIndex;
  parameterIndex: FilterIndex;
}
export function useTableRows({
  rows,
  groupIndex,
  intervalIndex,
  variableIndex,
  parameterIndex,
}: TableRowsProps) {
  const variables = useVariables();
  const parameters = useParameters();
  const concentrationVariables = useConcentrationVariables();
  const { intervals, simulations } = useContext(SimulationContext);

  return rows.map((row, index) => {
    const header =
      "start" in row && "end" in row && "unit" in row
        ? `${row.start} – ${row.end} [${row.unit}]`
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
