import { useEffect, useMemo, useState } from "react";
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
  Tooltip,
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
import { getDefaultOptimiseInputs, getSigmaVariables } from "./utils";

const DEFAULT_MAX_ITERATIONS = 100;
const OPTIMISE_METHOD_OPTIONS = [
  { value: "pso", label: "PSO" },
  { value: "cmaes", label: "CMA-ES" },
  { value: "nelder-mead", label: "Nelder-Mead" },
  { value: "gradient_descent", label: "Gradient Descent" },
  { value: "adam", label: "Adam" },
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

type SigmaRowProps = {
  label: string;
  logSigma: number;
  onLogSigmaChange: (value: number) => void;
  bounds: [number, number];
  onBoundsChange: (bounds: [number, number]) => void;
};

// A single log-sigma value plus its [min, max] bounds. Shared by the additive
// and (combined-model) proportional sigma rows.
const SigmaRow = ({
  label,
  logSigma,
  onLogSigmaChange,
  bounds,
  onBoundsChange,
}: SigmaRowProps) => (
  <Stack direction="row" spacing={1}>
    <TextField
      label={label}
      type="number"
      size="small"
      value={logSigma}
      onChange={(event) => onLogSigmaChange(Number(event.target.value))}
      fullWidth
    />
    <TextField
      label="Min bound"
      type="number"
      size="small"
      value={bounds[0]}
      onChange={(event) => onBoundsChange([Number(event.target.value), bounds[1]])}
      fullWidth
    />
    <TextField
      label="Max bound"
      type="number"
      size="small"
      value={bounds[1]}
      onChange={(event) => onBoundsChange([bounds[0], Number(event.target.value)])}
      fullWidth
    />
  </Stack>
);

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
  const [noiseModel, setNoiseModel] = useState<
    "additive" | "multiplicative" | "combined"
  >("multiplicative");
  const [method, setMethod] = useState<string>(DEFAULT_OPTIMISE_METHOD);
  const [selectedSubjectGroupIds, setSelectedSubjectGroupIds] = useState<number[]>([]);
  const [selectedBiomarkerTypeIds, setSelectedBiomarkerTypeIds] = useState<number[]>([]);
  // Per-output-variable noise sigma, keyed by model output variable id. The
  // "*Mult" maps hold the second (proportional) sigma used by the combined
  // noise model.
  const [logSigmaByVar, setLogSigmaByVar] = useState<Record<number, number>>({});
  const [sigmaBoundsByVar, setSigmaBoundsByVar] = useState<
    Record<number, [number, number]>
  >({});
  const [logSigmaMultByVar, setLogSigmaMultByVar] = useState<
    Record<number, number>
  >({});
  const [sigmaBoundsMultByVar, setSigmaBoundsMultByVar] = useState<
    Record<number, [number, number]>
  >({});
  const isCombined = noiseModel === "combined";

  // The distinct output variables to fit a sigma for follow the selected
  // observations, in the same canonical (ascending id) order as the backend.
  const sigmaVariables = useMemo(
    () =>
      getSigmaVariables(
        biomarkerTypes.filter((bt) => selectedBiomarkerTypeIds.includes(bt.id)),
      ),
    [biomarkerTypes, selectedBiomarkerTypeIds],
  );

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

    // Per-variable sigma starts at the defaults (log σ = 0, bounds [-20, 20]);
    // the render/payload fall back to these when a variable has no entry.
    setLogSigmaByVar({});
    setSigmaBoundsByVar({});
    setLogSigmaMultByVar({});
    setSigmaBoundsMultByVar({});
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
      noise_model: noiseModel,
      method,
      biomarker_types: selectedBiomarkerTypeIds,
      subject_groups: selectedSubjectGroupIds,
      // log_sigma / sigma_bounds are ordered by sigmaVariables (ascending
      // variable id), matching the backend's canonical output ordering.
      log_sigma: sigmaVariables.map((varId) => logSigmaByVar[varId] ?? 0),
      sigma_bounds: sigmaVariables.map(
        (varId) => sigmaBoundsByVar[varId] ?? [-20, 20],
      ),
      // The second (proportional) sigma is only sent for the combined model.
      ...(isCombined
        ? {
            log_sigma_mult: sigmaVariables.map(
              (varId) => logSigmaMultByVar[varId] ?? 0,
            ),
            sigma_bounds_mult: sigmaVariables.map(
              (varId) => sigmaBoundsMultByVar[varId] ?? [-20, 20],
            ),
          }
        : {}),
    });
    onClose();
  };

  const optimiseDisabled =
    loadingOptimise ||
    orderedSliders.length < 1 ||
    selectedBiomarkerTypeIds.length === 0;
  // Explain why optimising is disabled (and how to enable it) via a tooltip.
  // Empty while loading or enabled so no tooltip is shown then.
  const optimiseDisabledReason =
    orderedSliders.length < 1
      ? "Add at least one parameter slider to fit."
      : selectedBiomarkerTypeIds.length === 0
        ? "Select at least one observation to fit against."
        : "";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { maxHeight: "calc(100vh - 128px)", mt: "64px" } }}>
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
          <Typography variant="subtitle2" sx={{ marginBottom: ".5rem" }}>
            {isCombined
              ? "Noise standard deviations (log scale): additive σ_a and proportional σ_m"
              : "Noise standard deviation (log scale)"}
          </Typography>
          {sigmaVariables.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Select at least one observation to configure its noise.
            </Typography>
          )}
          {sigmaVariables.map((varId) => {
            const variable = variables.find((item) => item.id === varId);
            const label = variable?.description
              ? `${variable.name} (${variable.description})`
              : variable?.name || `Variable ${varId}`;
            return (
              <Box key={varId}>
                <Typography variant="body2" sx={{ marginBottom: ".25rem" }}>
                  {label}
                </Typography>
                <SigmaRow
                  label={isCombined ? "Log sigma (additive)" : "Log sigma"}
                  logSigma={logSigmaByVar[varId] ?? 0}
                  onLogSigmaChange={(value) =>
                    setLogSigmaByVar((current) => ({ ...current, [varId]: value }))
                  }
                  bounds={sigmaBoundsByVar[varId] ?? [-20, 20]}
                  onBoundsChange={(value) =>
                    setSigmaBoundsByVar((current) => ({ ...current, [varId]: value }))
                  }
                />
                {isCombined && (
                  <Box sx={{ marginTop: ".5rem" }}>
                    <SigmaRow
                      label="Log sigma (proportional)"
                      logSigma={logSigmaMultByVar[varId] ?? 0}
                      onLogSigmaChange={(value) =>
                        setLogSigmaMultByVar((current) => ({
                          ...current,
                          [varId]: value,
                        }))
                      }
                      bounds={sigmaBoundsMultByVar[varId] ?? [-20, 20]}
                      onBoundsChange={(value) =>
                        setSigmaBoundsMultByVar((current) => ({
                          ...current,
                          [varId]: value,
                        }))
                      }
                    />
                  </Box>
                )}
              </Box>
            );
          })}
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
                Observations
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
                    No observations
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
                  setNoiseModel(
                    event.target.value as
                      | "additive"
                      | "multiplicative"
                      | "combined",
                  )
                }
              >
                <MenuItem value="additive">Additive</MenuItem>
                <MenuItem value="multiplicative">Multiplicative</MenuItem>
                <MenuItem value="combined">Combined</MenuItem>
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
        <Tooltip title={optimiseDisabledReason} placement="top">
          <span>
            <Button
              variant="contained"
              onClick={handleCustomOptimise}
              disabled={optimiseDisabled}
              data-cy="optimise-custom-parameters"
            >
              Optimise
            </Button>
          </span>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
};

export default OptimisationSettings;
