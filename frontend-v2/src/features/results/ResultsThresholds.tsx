import { FC } from "react";
import {
  Box,
  FormControl,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useSelector } from "react-redux";
import {
  useCombinedModelListQuery,
  useVariableListQuery,
  useVariableUpdateMutation,
} from "../../app/backendApi";
import { RootState } from "../../app/store";
import { useUnits } from "./useUnits";

const ResultsThresholds: FC = () => {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const { data: models } = useCombinedModelListQuery(
    { projectId: projectId || 0 },
    { skip: !projectId },
  );
  const model = models?.[0];
  const { data: variables } = useVariableListQuery(
    { dosedPkModelId: model?.id || 0 },
    { skip: !model?.id },
  );
  const units = useUnits();
  const [updateVariable] = useVariableUpdateMutation();

  const secondaryVariables = variables?.filter((variable) =>
    model?.derived_variables?.some(
      (derivedVariable) =>
        derivedVariable.pk_variable === variable.id &&
        derivedVariable.type === "AUC",
    ),
  );

  const update = (id: number, field: string, value: string) => {
    const parsedValue = value === "" ? null : parseFloat(value);
    const variable = variables?.find((item) => item.id === id);
    if (variable && Number.isFinite(parsedValue)) {
      updateVariable({ id, variable: { ...variable, [field]: parsedValue } });
    }
  };

  return (
    <Stack spacing={1} sx={{ width: "100%" }}>
      {secondaryVariables?.map((variable) => {
        const modelUnit = units.find((unit) => unit.id === variable.unit);
        const compatibleUnits = modelUnit?.compatible_units || [];
        return (
          <Box
            component="fieldset"
            key={variable.id}
            sx={{ border: 0, borderBottom: "1px solid #dbd6d1", p: 0, pb: 1 }}
          >
            <Typography
              component="legend"
              title={variable.description || undefined}
              sx={{
                fontSize: "1rem",
                fontWeight: 500,
                lineHeight: 1.5,
                px: 0.5,
                mb: 0.5,
              }}
            >
              {variable.name}
            </Typography>
            <Stack spacing={0.5}>
              <TextField
                size="small"
                type="number"
                label="Lower threshold"
                defaultValue={variable.lower_threshold ?? 0}
                onChange={(event) =>
                  update(variable.id, "lower_threshold", event.target.value)
                }
              />
              <TextField
                size="small"
                type="number"
                label="Upper threshold"
                defaultValue={variable.upper_threshold ?? ""}
                onChange={(event) =>
                  update(variable.id, "upper_threshold", event.target.value)
                }
              />
              <FormControl size="small">
                <Select
                  value={String(variable.secondary_unit || "")}
                  onChange={(event) =>
                    update(variable.id, "secondary_unit", event.target.value)
                  }
                  displayEmpty
                  aria-label={`Unit: ${variable.name}`}
                >
                  <MenuItem value="" disabled>
                    Select unit
                  </MenuItem>
                  {compatibleUnits.map((unit) => (
                    <MenuItem key={unit.id} value={unit.id}>
                      {unit.symbol}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
};

export default ResultsThresholds;
