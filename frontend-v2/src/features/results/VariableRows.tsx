import { Box } from "@mui/material";
import { FC, useContext } from "react";

import { SimulationContext } from "../../contexts/SimulationContext";
import { VariableRead } from "../../app/backendApi";

import VariableTable from "./VariableTable";
import { tableRow } from "./utils";
import { useVariables } from "./useVariables";
import { useUnits } from "./useUnits";

const TIME_VARS = ["time", "t"];
interface VariableRowsProps {
  groupIndex: number;
  intervalIndex: number;
  rows: VariableRead[];
}

const VariableRows: FC<VariableRowsProps> = ({
  groupIndex,
  intervalIndex,
  rows = [],
}) => {
  const units = useUnits();
  const variables = useVariables();
  const { intervals, simulations, thresholds } = useContext(SimulationContext);

  const simulation = simulations[groupIndex];
  const variable = rows[0];
  const aucVariable =
    variable && variables?.find((v) => v.name === `calc_${variable.name}_AUC`);
  const timeVariable = variables?.find((v) => TIME_VARS.includes(v.name));
  const unit = variable && units?.find((u) => u.id === variable.unit);
  const aucUnit = aucVariable && units?.find((u) => u.id === aucVariable.unit);
  const timeUnit =
    timeVariable && units?.find((u) => u.id === timeVariable.unit);

  if (!rows[0]) {
    return <p>Loading…</p>;
  }

  const tableRows = rows.map((row) => {
    const header = row.name;
    const aucVariable =
      variable && variables?.find((v) => v.name === `calc_${row.name}_AUC`);
    const unit = row && units?.find((u) => u.id === row.unit);
    const aucUnit =
      aucVariable && units?.find((u) => u.id === aucVariable.unit);
    return tableRow(
      header,
      intervals[intervalIndex],
      row,
      intervals,
      variables,
      simulation,
      thresholds,
      unit,
      aucUnit,
      timeUnit,
    );
  });

  try {
    return (
      <>
        <Box id="interval-tabpanel">
          <VariableTable
            rowColumn="Variable"
            rows={tableRows}
            timeVariable={timeVariable}
            simulation={simulation}
            unit={unit}
            aucUnit={aucUnit}
            timeUnit={timeUnit}
          />
        </Box>
      </>
    );
  } catch (e: any) {
    console.error(e);
    return <div>Error {e.message}</div>;
  }
};

export default VariableRows;
