import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  BiomarkerTypeRead,
  Optimise,
  SimulationSlider,
  SimulationYAxis,
  SubjectGroupRead,
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
  onOptimise: (optimiseInputs: Omit<Optimise, "subject_groups"> & { subject_groups: number[] }) => void;
  loadingOptimise: boolean;
  plots: { y_axes: SimulationYAxis[] }[];
  biomarkerTypes: BiomarkerTypeRead[];
  groups: SubjectGroupRead[];
  visibleSubjectGroupIds: number[];
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
  plots,
  biomarkerTypes,
  groups,
  visibleSubjectGroupIds,
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
  const [selectedSubjectGroupIds, setSelectedSubjectGroupIds] = useState<number[]>([]);
  const [selectedBiomarkerTypeIds, setSelectedBiomarkerTypeIds] = useState<number[]>([]);
  const [logSigma, setLogSigma] = useState<number>(0);
  const [sigmaBounds, setSigmaBounds] = useState<[number, number]>([-20, 20]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const defaultOptimiseInputs = getDefaultOptimiseInputs({
      orderedSliders,
      variables,
      getSliderValue,
      getSliderBounds,
      plots,
      biomarkerTypes,
      subjectGroups: [],
    });

    setCustomStarting(defaultOptimiseInputs.starting);
    setCustomLowerBounds(defaultOptimiseInputs.bounds[0]);
    setCustomUpperBounds(defaultOptimiseInputs.bounds[1]);
    setMaxIterations(String(DEFAULT_MAX_ITERATIONS));
    setNoiseModel("multiplicative");
    setMethod(DEFAULT_OPTIMISE_METHOD);
    setSelectedSubjectGroupIds(visibleSubjectGroupIds);
    setSelectedBiomarkerTypeIds(defaultOptimiseInputs.biomarker_types ?? []);
    setLogSigma(defaultOptimiseInputs.log_sigma ?? 0);
    setSigmaBounds(defaultOptimiseInputs.sigma_bounds ?? [-20, 20]);
  }, [open, orderedSliders, variables, getSliderBounds, getSliderValue, plots, biomarkerTypes, visibleSubjectGroupIds]);

  const handleToggleGroup = (id: number) => {
    setSelectedSubjectGroupIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  };

  const handleToggleBiomarkerType = (id: number) => {
    setSelectedBiomarkerTypeIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    );
  };

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
      biomarker_types: selectedBiomarkerTypeIds,
      subject_groups: selectedSubjectGroupIds,
      log_sigma: logSigma,
      sigma_bounds: sigmaBounds,
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
          <Stack direction="row" spacing={1}>
            <TextField
              label="Log sigma"
              type="number"
              size="small"
              value={logSigma}
              onChange={(event) => setLogSigma(Number(event.target.value))}
              fullWidth
            />
            <TextField
              label="Sigma min bound"
              type="number"
              size="small"
              value={sigmaBounds[0]}
              onChange={(event) => {
                const value = Number(event.target.value);
                setSigmaBounds((current) => [value, current[1]]);
              }}
              fullWidth
            />
            <TextField
              label="Sigma max bound"
              type="number"
              size="small"
              value={sigmaBounds[1]}
              onChange={(event) => {
                const value = Number(event.target.value);
                setSigmaBounds((current) => [current[0], value]);
              }}
              fullWidth
            />
          </Stack>
          <Divider />
          <Stack direction="row" spacing={4}>
            <Box>
              <Typography variant="subtitle2" sx={{ marginBottom: ".25rem" }}>
                Subject Groups
              </Typography>
              <FormGroup>
                {groups.map((group) => (
                  <FormControlLabel
                    key={group.id}
                    control={
                      <Checkbox
                        size="small"
                        checked={selectedSubjectGroupIds.includes(group.id)}
                        onChange={() => handleToggleGroup(group.id)}
                      />
                    }
                    label={group.name}
                  />
                ))}
                {groups.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No subject groups
                  </Typography>
                )}
              </FormGroup>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ marginBottom: ".25rem" }}>
                Biomarker Types
              </Typography>
              <FormGroup>
                {biomarkerTypes.map((bt) => {
                  const variable = variables.find((v) => v.id === bt.variable);
                  const label = variable?.description
                    ? `${variable.name} (${variable.description})`
                    : variable?.name || bt.name;
                  return (
                    <FormControlLabel
                      key={bt.id}
                      control={
                        <Checkbox
                          size="small"
                          checked={selectedBiomarkerTypeIds.includes(bt.id)}
                          onChange={() => handleToggleBiomarkerType(bt.id)}
                        />
                      }
                      label={label}
                    />
                  );
                })}
                {biomarkerTypes.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No biomarker types
                  </Typography>
                )}
              </FormGroup>
            </Box>
          </Stack>
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
