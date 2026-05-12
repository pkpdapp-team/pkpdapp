import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  Optimise,
  SimulationSlider,
  VariableRead,
} from "../../app/backendApi";
import { getDefaultOptimiseInputs } from "./utils";

const DEFAULT_MAX_ITERATIONS = 100;
const OPTIMISE_METHOD_OPTIONS = [
  { value: "pso", label: "PSO" },
  { value: "cmaes", label: "CMA-ES" },
  { value: "nelder-mead", label: "Nelder-Mead" },
  { value: "gradient_descent", label: "Gradient Descent" },
  { value: "adam", label: "Adam" },
  { value: "irprop", label: "iRprop-" },
] as const;
const DEFAULT_OPTIMISE_METHOD = "pso";

type OptimisationSettingsProps = {
  open: boolean;
  onClose: () => void;
  orderedSliders: (SimulationSlider & { fieldArrayIndex: number })[];
  variables: VariableRead[];
  getSliderValue: (variableId: number, variable?: VariableRead) => number;
  getSliderBounds: (variableId: number, variable?: VariableRead) => [number, number];
  onOptimise: (optimiseInputs: Omit<Optimise, "subject_groups">) => void;
  loadingOptimise: boolean;
};

const OptimisationSettings = ({
  open,
  onClose,
  orderedSliders,
  variables,
  getSliderValue,
  getSliderBounds,
  onOptimise,
  loadingOptimise,
}: OptimisationSettingsProps) => {
  const [customStarting, setCustomStarting] = useState<number[]>([]);
  const [customLowerBounds, setCustomLowerBounds] = useState<number[]>([]);
  const [customUpperBounds, setCustomUpperBounds] = useState<number[]>([]);
  const [maxIterations, setMaxIterations] = useState<string>(
    String(DEFAULT_MAX_ITERATIONS),
  );
  const [noiseModel, setNoiseModel] = useState<"additive" | "multiplicative">(
    "multiplicative",
  );
  const [method, setMethod] = useState<string>(DEFAULT_OPTIMISE_METHOD);

  useEffect(() => {
    if (!open) {
      return;
    }

    const defaultOptimiseInputs = getDefaultOptimiseInputs({
      orderedSliders,
      variables,
      getSliderValue,
      getSliderBounds,
    });

    setCustomStarting(defaultOptimiseInputs.starting);
    setCustomLowerBounds(defaultOptimiseInputs.bounds[0]);
    setCustomUpperBounds(defaultOptimiseInputs.bounds[1]);
    setMaxIterations(String(DEFAULT_MAX_ITERATIONS));
    setNoiseModel("multiplicative");
    setMethod(DEFAULT_OPTIMISE_METHOD);
  }, [open, orderedSliders, variables, getSliderBounds, getSliderValue]);

  const handleCustomOptimise = () => {
    const inputs = orderedSliders.map((slider) => slider.variable);
    if (inputs.length < 1) {
      return;
    }

    onOptimise({
      inputs,
      starting: customStarting,
      bounds: [customLowerBounds, customUpperBounds],
      max_iterations: Number(maxIterations),
      use_multiplicative_noise: noiseModel === "multiplicative",
      method,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: "bold" }}>Optimisation Settings</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ marginTop: ".5rem" }}>
          {orderedSliders.map((slider, index) => {
            const variable = variables.find((item) => item.id === slider.variable);
            const label = variable?.description
              ? `${variable.name} (${variable.description})`
              : variable?.name || `Variable ${slider.variable}`;

            return (
              <Box key={slider.variable}>
                <Typography variant="subtitle2" sx={{ marginBottom: ".5rem" }}>
                  {label}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <TextField
                    label="Start"
                    type="number"
                    size="small"
                    value={customStarting[index] ?? ""}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setCustomStarting((currentValues) => {
                        const nextValues = [...currentValues];
                        nextValues[index] = value;
                        return nextValues;
                      });
                    }}
                    fullWidth
                  />
                  <TextField
                    label="Min bound"
                    type="number"
                    size="small"
                    value={customLowerBounds[index] ?? ""}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setCustomLowerBounds((currentValues) => {
                        const nextValues = [...currentValues];
                        nextValues[index] = value;
                        return nextValues;
                      });
                    }}
                    fullWidth
                  />
                  <TextField
                    label="Max bound"
                    type="number"
                    size="small"
                    value={customUpperBounds[index] ?? ""}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setCustomUpperBounds((currentValues) => {
                        const nextValues = [...currentValues];
                        nextValues[index] = value;
                        return nextValues;
                      });
                    }}
                    fullWidth
                  />
                </Stack>
              </Box>
            );
          })}
          <Divider />
          <Stack direction="row" spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel id="optimise-method-label">Method</InputLabel>
              <Select
                labelId="optimise-method-label"
                label="Method"
                value={method}
                onChange={(event) => setMethod(event.target.value)}
              >
                {OPTIMISE_METHOD_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel id="noise-model-label">Noise model</InputLabel>
              <Select
                labelId="noise-model-label"
                label="Noise model"
                value={noiseModel}
                onChange={(event) =>
                  setNoiseModel(event.target.value as "additive" | "multiplicative")
                }
              >
                <MenuItem value="additive">Additive</MenuItem>
                <MenuItem value="multiplicative">Multiplicative</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Max iterations"
              type="number"
              size="small"
              value={maxIterations}
              onChange={(event) => setMaxIterations(event.target.value)}
              fullWidth
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleCustomOptimise}
          disabled={loadingOptimise || orderedSliders.length < 1}
          data-cy="optimise-custom-parameters"
        >
          Optimise
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OptimisationSettings;
