import { Box } from "@mui/material";
import { FC } from "react";

import VariableTable from "./VariableTable";
import { useTableRows } from "./useTableRows";

interface GroupRowsProps {
  variableIndex: number;
  intervalIndex: number;
  parameterIndex: number;
  columns: string;
  rows: { name: string }[];
}

const GroupRows: FC<GroupRowsProps> = ({
  variableIndex = -1,
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
    intervalIndex,
    variableIndex,
    parameterIndex,
  });

  try {
    return (
      <Box id="interval-tabpanel">
        <VariableTable rowColumn="Group" columns={columns} rows={tableRows} />
      </Box>
    );
  } catch (e: any) {
    console.error(e);
    return <div>Error {e.message}</div>;
  }
};

export default GroupRows;
