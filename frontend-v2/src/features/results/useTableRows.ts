import { useContext } from "react";

import { SimulationContext } from "../../contexts/SimulationContext";

import { useConcentrationVariables } from "./useConcentrationVariables";
import { Parameter, useParameters } from "./useParameters";
import { useVariables } from "./useVariables";
import { tableRow } from "./utils";
import { VariableRead } from "../../app/backendApi";
import { TimeInterval } from "../../App";

interface TableRowsProps {
  rows: { name: string }[] | VariableRead[] | TimeInterval[] | Parameter[];
  groupIndex?: number;
  intervalIndex?: number;
  variableIndex?: number;
  parameterIndex?: number;
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
      intervalIndex === undefined &&
      "start" in row &&
      "end" in row &&
      "unit" in row
        ? `${row.start} – ${row.end} [${row.unit}]`
        : "name" in row
          ? row.name
          : "";
    return tableRow(
      header,
      intervalIndex === undefined ? intervals[index] : intervals[intervalIndex],
      variableIndex === undefined
        ? concentrationVariables[index]
        : concentrationVariables[variableIndex],
      intervals,
      variables,
      groupIndex === undefined ? simulations[index] : simulations[groupIndex],
      parameters,
      parameterIndex === undefined
        ? parameters[index]
        : parameters[parameterIndex],
      concentrationVariables,
      simulations,
    );
  });
}
