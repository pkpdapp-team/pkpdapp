import { Box } from "@mui/material";
import { FC } from "react";

import { TimeInterval } from "../../App";

import VariableTable from "./VariableTable";
import { useTableRows } from "./useTableRows";

interface IntervalRowsProps {
  groupIndex: number;
  variableIndex: number;
  parameterIndex: number;
  columns: string;
  rows: TimeInterval[];
}

const IntervalRows: FC<IntervalRowsProps> = ({
  groupIndex = -1,
  variableIndex = -1,
  parameterIndex = -1,
  columns = "",
  rows = [],
}) => {
  if (!rows[0]) {
    return <p>Loading…</p>;
  }

  const tableRows = useTableRows({
    rows,
    groupIndex,
    variableIndex,
    parameterIndex,
  });

  try {
    return (
      <Box id="cvar-tabpanel">
        <VariableTable
          rowColumn="Interval"
          columns={columns}
          rows={tableRows}
        />
      </Box>
    );
  } catch (e: any) {
    console.error(e);
    return <div>Error {e.message}</div>;
  }
};

export default IntervalRows;
