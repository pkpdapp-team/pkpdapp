import { Box } from "@mui/material";
import { FC, useContext } from "react";

import { TimeInterval } from "../../App";
import { SimulationContext } from "../../contexts/SimulationContext";

import { useConcentrationVariables } from "./useConcentrationVariables";
import VariableTable from "./VariableTable";
import { tableRow } from "./utils";
import { useVariables } from "./useVariables";
import { useUnits } from "./useUnits";

const TIME_VARS = ["time", "t"];
interface IntervalRowsProps {
  groupIndex: number;
  variableIndex: number;
  rows: TimeInterval[];
}

const IntervalRows: FC<IntervalRowsProps> = ({
  groupIndex,
  variableIndex,
  rows = [],
}) => {
  const units = useUnits();
  const variables = useVariables();
  const { simulations, thresholds } = useContext(SimulationContext);
  const concentrationVariables = useConcentrationVariables();

  const simulation = simulations[groupIndex];
  const variable = concentrationVariables[variableIndex];
  const aucVariable =
    variable && variables?.find((v) => v.name === `calc_${variable.name}_AUC`);
  const timeVariable = variables?.find((v) => TIME_VARS.includes(v.name));
  const unit = variable && units?.find((u) => u.id === variable.unit);
  const aucUnit = aucVariable && units?.find((u) => u.id === aucVariable.unit);
  const timeUnit =
    timeVariable && units?.find((u) => u.id === timeVariable.unit);

  if (!concentrationVariables[variableIndex]) {
    return <p>Loading…</p>;
  }

  const tableRows = rows.map((interval) => {
    const header = `${interval.start} – ${interval.end} ${interval.unit}`;
    return tableRow(
      header,
      interval,
      variable,
      rows,
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
        <Box id="cvar-tabpanel">
          <VariableTable
            rowColumn="Interval"
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

export default IntervalRows;
