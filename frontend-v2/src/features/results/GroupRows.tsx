import { Box } from "@mui/material";
import { FC, useContext } from "react";

import { SimulationContext } from "../../contexts/SimulationContext";

import VariableTable from "./VariableTable";
import { tableRow } from "./utils";
import { useConcentrationVariables } from "./useConcentrationVariables";
import { useVariables } from "./useVariables";
import { useUnits } from "./useUnits";

const TIME_VARS = ["time", "t"];
interface GroupRowsProps {
  variableIndex: number;
  intervalIndex: number;
  rows: { name: string }[];
}

const GroupRows: FC<GroupRowsProps> = ({
  variableIndex,
  intervalIndex,
  rows = [],
}) => {
  const units = useUnits();
  const variables = useVariables();
  const { intervals, simulations, thresholds } = useContext(SimulationContext);
  const concentrationVariables = useConcentrationVariables();

  const interval = intervals[intervalIndex];
  const variable = concentrationVariables[variableIndex];
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

  const tableRows = rows.map((row, index) => {
    const header = row.name;
    const aucVariable =
      variable &&
      variables?.find((v) => v.name === `calc_${variable.name}_AUC`);
    const unit = variable && units?.find((u) => u.id === variable.unit);
    const aucUnit =
      aucVariable && units?.find((u) => u.id === aucVariable.unit);
    return tableRow(
      header,
      interval,
      variable,
      intervals,
      variables,
      simulations[index],
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
            rowColumn="Group"
            rows={tableRows}
            timeVariable={timeVariable}
            simulation={simulations[0]}
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

export default GroupRows;
