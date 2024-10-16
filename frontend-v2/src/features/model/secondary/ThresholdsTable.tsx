import { ChangeEvent, FC, useContext, useState } from "react";
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
import { SimulationContext } from "../../../contexts/SimulationContext";

function VariableRow({
  variable,
  unit,
}: {
  variable: VariableRead;
  unit: UnitRead | undefined;
}) {
  const { thresholds, setThresholds } = useContext(SimulationContext);
  const [unitSymbol, setUnitSymbol] = useState<string | undefined>(
    unit?.symbol,
  );
  function onChangeLowerThreshold(event: ChangeEvent<HTMLInputElement>) {
    const newValue = parseFloat(event.target.value);
    const oldThresholds = thresholds[variable.name];
    if (!isNaN(newValue)) {
      setThresholds({
        ...thresholds,
        [variable.name]: {
          ...oldThresholds,
          lower: newValue,
        },
      });
    }
  }
  function onChangeUpperThreshold(event: ChangeEvent<HTMLInputElement>) {
    const newValue = parseFloat(event.target.value);
    const oldThresholds = thresholds[variable.name];
    if (!isNaN(newValue)) {
      setThresholds({
        ...thresholds,
        [variable.name]: {
          ...oldThresholds,
          upper: newValue,
        },
      });
    }
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
          defaultValue={thresholds[variable.name]?.lower}
          onChange={onChangeLowerThreshold}
        />
      </TableCell>
      <TableCell>
        <TextField
          type="number"
          defaultValue={thresholds[variable.name]?.upper}
          onChange={onChangeUpperThreshold}
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
        <TableCell>Lower Threshold</TableCell>
        <TableCell>Upper Threshold</TableCell>
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
