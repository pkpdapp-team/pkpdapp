import { Box } from "@mui/material";
import { FC } from "react";

import VariableTable from "./VariableTable";
import { Parameter } from "./useParameters";
import { useTableRows } from "./useTableRows";

interface ParameterRowsProps {
  groupIndex: number;
  intervalIndex: number;
  variableIndex: number;
  columns: string;
  rows: Parameter[];
}

const ParameterRows: FC<ParameterRowsProps> = ({
  groupIndex = -1,
  intervalIndex = -1,
  variableIndex = -1,
  columns = "",
  rows = [],
}) => {
  if (!rows[0]) {
    return <p>Loading…</p>;
  }

  const tableRows = useTableRows({
    rows,
    groupIndex,
    intervalIndex,
    variableIndex,
  });

  try {
    return (
      <Box id="interval-tabpanel">
        <VariableTable
          rowColumn="Variable"
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

export default ParameterRows;
