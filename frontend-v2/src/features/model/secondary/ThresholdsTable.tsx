import { ChangeEvent, FC, useState } from "react";
import {
  MenuItem,
  Select,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableProps,
  TableRow,
  TextField,
  Tooltip,
} from "@mui/material";
import { useSelector } from "react-redux";

import { RootState } from "../../../app/store";
import {
  UnitRead,
  useCombinedModelListQuery,
  useProjectRetrieveQuery,
  useUnitListQuery,
  useVariableListQuery,
  VariableRead,
} from "../../../app/backendApi";

function VariableRow({
  variable,
  unit,
}: {
  variable: VariableRead;
  unit: UnitRead | undefined;
}) {
  const [threshold, setThreshold] = useState<number>(0);
  const [unitSymbol, setUnitSymbol] = useState<string | undefined>(
    unit?.symbol,
  );
  function onChangeThreshold(event: ChangeEvent<HTMLInputElement>) {
    setThreshold(event.target.value as unknown as number);
  }
  function onChangeUnit(event: SelectChangeEvent) {
    setUnitSymbol(event.target.value as string);
  }

  return (
    <TableRow>
      <TableCell>
        <Tooltip title={`${variable.name}: ${variable.description}`}>
          <span>{variable.name}</span>
        </Tooltip>
      </TableCell>
      <TableCell>
        <TextField
          type="number"
          value={threshold}
          onChange={onChangeThreshold}
        />
      </TableCell>
      <TableCell>
        <Select value={unitSymbol} onChange={onChangeUnit}>
          {unit?.compatible_units?.map((unit) => (
            <MenuItem key={unit.id} value={unit.symbol}>
              {unit.symbol}
            </MenuItem>
          ))}
        </Select>
      </TableCell>
    </TableRow>
  );
}

const ThresholdsTable: FC<TableProps> = (props) => {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;
  const { data: project } = useProjectRetrieveQuery(
    { id: projectIdOrZero },
    { skip: !projectId },
  );
  const { data: models } = useCombinedModelListQuery(
    { projectId: projectIdOrZero },
    { skip: !projectId },
  );
  const model = models?.[0] || null;
  const { data: variables } = useVariableListQuery(
    { dosedPkModelId: model?.id || 0 },
    { skip: !model?.id },
  );
  const { data: units } = useUnitListQuery(
    { compoundId: project?.compound },
    { skip: !project || !project.compound },
  );

  const concentrationVariables = variables?.filter((variable) =>
    model?.derived_variables?.find(
      (dv) => dv.pk_variable === variable.id && dv.type === "AUC",
    ),
  );
  return (
    <Table {...props}>
      <TableHead>
        <TableCell>Variable</TableCell>
        <TableCell>Threshold</TableCell>
        <TableCell>Unit</TableCell>
      </TableHead>
      <TableBody>
        {concentrationVariables?.map((variable) => (
          <VariableRow
            key={variable.id}
            variable={variable}
            unit={units?.find((unit) => unit.id === variable.unit)}
          />
        ))}
      </TableBody>
    </Table>
  );
};

export default ThresholdsTable;
