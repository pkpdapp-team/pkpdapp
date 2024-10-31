import { Box } from "@mui/material";
import { FC } from "react";

import { VariableRead } from "../../app/backendApi";

import VariableTable from "./VariableTable";
import { useTableRows } from "./useTableRows";

interface VariableRowsProps {
  groupIndex: number;
  intervalIndex: number;
  parameterIndex: number;
  columns: string;
  rows: VariableRead[];
}

const VariableRows: FC<VariableRowsProps> = ({
  groupIndex = -1,
  intervalIndex = -1,
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
    intervalIndex,
    parameterIndex,
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

export default VariableRows;
