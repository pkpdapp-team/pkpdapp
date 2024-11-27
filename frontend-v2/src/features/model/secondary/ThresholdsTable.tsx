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
  useVariableUpdateMutation,
  VariableRead,
} from "../../../app/backendApi";

function useModel() {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;
  const { data: models } = useCombinedModelListQuery(
    { projectId: projectIdOrZero },
    { skip: !projectId },
  );
  return models?.[0] || null;
}

function useUnits() {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;
  const { data: project } = useProjectRetrieveQuery(
    { id: projectIdOrZero },
    { skip: !projectId },
  );
  const { data: units } = useUnitListQuery(
    { compoundId: project?.compound },
    { skip: !project || !project.compound },
  );
  return units;
}

function useVariables() {
  const model = useModel();
  const { data: variables } = useVariableListQuery(
    { dosedPkModelId: model?.id || 0 },
    { skip: !model?.id },
  );
  return variables;
}

function VariableRow({
  variable,
  unit,
}: {
  variable: VariableRead;
  unit: UnitRead | undefined;
}) {
  const units = useUnits();
  const [updateVariable] = useVariableUpdateMutation();
  const [unitSymbol, setUnitSymbol] = useState<string | undefined>(
    unit?.symbol,
  );
  function onChangeLowerThreshold(event: ChangeEvent<HTMLInputElement>) {
    const newValue = parseFloat(event.target.value);
    if (!isNaN(newValue)) {
      updateVariable({
        id: variable.id,
        variable: {
          ...variable,
          lower_threshold: newValue,
        },
      });
    }
  }
  function onChangeUpperThreshold(event: ChangeEvent<HTMLInputElement>) {
    const newValue = parseFloat(event.target.value);
    if (!isNaN(newValue)) {
      updateVariable({
        id: variable.id,
        variable: {
          ...variable,
          upper_threshold: newValue,
        },
      });
    }
  }
  function onChangeUnit(event: SelectChangeEvent) {
    setUnitSymbol(event.target.value as string);
    const unit = units?.find((unit) => unit.symbol === event.target.value);
    if (unit) {
      updateVariable({
        id: variable.id,
        variable: {
          ...variable,
          threshold_unit: unit.id,
        },
      });
    }
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
          defaultValue={variable.lower_threshold || 0}
          onChange={onChangeLowerThreshold}
          size="small"
        />
      </TableCell>
      <TableCell>
        <TextField
          type="number"
          defaultValue={variable.upper_threshold || Infinity}
          onChange={onChangeUpperThreshold}
          size="small"
        />
      </TableCell>
      <TableCell>
        <Select value={unitSymbol} onChange={onChangeUnit} size="small">
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
  const units = useUnits();
  const variables = useVariables();
  const model = useModel();

  const concentrationVariables = variables?.filter((variable) =>
    model?.derived_variables?.find(
      (dv) => dv.pk_variable === variable.id && dv.type === "AUC",
    ),
  );
  return (
    <Table {...props}>
      <TableHead>
        <TableCell>Variable</TableCell>
        <TableCell>Lower Threshold</TableCell>
        <TableCell>Upper Threshold</TableCell>
        <TableCell>Unit</TableCell>
      </TableHead>
      <TableBody>
        {concentrationVariables?.map((variable) => (
          <VariableRow
            key={variable.id}
            variable={variable}
            unit={units?.find(
              (unit) => unit.id === (variable.threshold_unit || variable.unit),
            )}
          />
        ))}
      </TableBody>
    </Table>
  );
};

export default ThresholdsTable;
