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
  CombinedModelRead,
  Optimise,
  SimulationSlider,
  SimulationYAxis,
  SubjectGroupRead,
  VariableRead,
} from "../../app/backendApi";
import {
  getDefaultOptimiseInputs,
  getMaxObservationByVariable,
  getSigmaVariables,
  sanitizeMaxIterations,
} from "./utils";
import { DEFAULT_NOISE_MODEL, NoiseModel } from "./useOptimise";
import { SubjectBiomarker } from "../../hooks/useDataset";
import { UnitReadWithCompatible } from "../../shared/unitConversion";
import HelpButton from "../../components/HelpButton";

const OPTIMISE_METHOD_OPTIONS = [
  { value: "pso", label: "PSO" },
  { value: "cmaes", label: "CMA-ES" },
  { value: "nelder-mead", label: "Nelder-Mead" },
] as const;

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
  // Observation data used to default each sigma's upper bound to the maximum
  // absolute observed value for its output variable.
  subjectBiomarkers: SubjectBiomarker[][] | undefined;
  units: UnitReadWithCompatible[];
  model: CombinedModelRead;
  // Persisted optimisation settings, owned by useOptimise so they survive the
  // dialog closing/reopening and are shared with the sidebar Fit button.
  method: string;
  setMethod: (method: string) => void;
  maxIterations: string;
  setMaxIterations: (maxIterations: string) => void;
  // Per-variable "optimise in log space" overrides, keyed by model variable id.
  // Sparse maps: an absent entry falls back to the computed default.
  paramUseLogSpace: Record<number, boolean>;
  setParamUseLogSpace: (value: Record<number, boolean>) => void;
  sigmaUseLogSpace: Record<number, boolean>;
  setSigmaUseLogSpace: (value: Record<number, boolean>) => void;
  sigmaMultUseLogSpace: Record<number, boolean>;
  setSigmaMultUseLogSpace: (value: Record<number, boolean>) => void;
  // Per-output-variable sigma start / bounds and noise-model overrides, keyed by
  // model output variable id. Sparse maps: an absent entry falls back to the
  // data-derived default, a present entry is the user's explicit choice.
  sigmaStartByVar: Record<number, number>;
  setSigmaStartByVar: (value: Record<number, number>) => void;
  sigmaBoundsByVar: Record<number, [number, number]>;
  setSigmaBoundsByVar: (value: Record<number, [number, number]>) => void;
  sigmaMultStartByVar: Record<number, number>;
  setSigmaMultStartByVar: (value: Record<number, number>) => void;
  sigmaBoundsMultByVar: Record<number, [number, number]>;
  setSigmaBoundsMultByVar: (value: Record<number, [number, number]>) => void;
  noiseModelByVar: Record<number, NoiseModel>;
  setNoiseModelByVar: (value: Record<number, NoiseModel>) => void;
};

type SigmaRowProps = {
  label: string;
  sigma: number;
  onSigmaChange: (value: number) => void;
  bounds: [number, number];
  onBoundsChange: (bounds: [number, number]) => void;
  useLogSpace: boolean;
  onUseLogSpaceChange: (value: boolean) => void;
};

// A single (linear) sigma value plus its [min, max] bounds and a "Log scale"
// toggle selecting whether it is fit in log space. Shared by the additive and
// (combined-model) proportional sigma rows.
const SigmaRow = ({
  label,
  sigma,
  onSigmaChange,
  bounds,
  onBoundsChange,
  useLogSpace,
  onUseLogSpaceChange,
}: SigmaRowProps) => (
  <Stack direction="row" spacing={1} sx={{
    alignItems: "center"
  }}>
    <TextField
      label={label}
      type="number"
      size="small"
      value={sigma}
      onChange={(event) => onSigmaChange(Number(event.target.value))}
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
    <FormControlLabel
      sx={{ whiteSpace: "nowrap" }}
      control={
        <Checkbox
          size="small"
          checked={useLogSpace}
          onChange={(event) => onUseLogSpaceChange(event.target.checked)}
        />
      }
      label="Log scale"
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
  subjectBiomarkers,
  units,
  model,
  method,
  setMethod,
  maxIterations,
  setMaxIterations,
  paramUseLogSpace,
  setParamUseLogSpace,
  sigmaUseLogSpace,
  setSigmaUseLogSpace,
  sigmaMultUseLogSpace,
  setSigmaMultUseLogSpace,
  sigmaStartByVar,
  setSigmaStartByVar,
  sigmaBoundsByVar,
  setSigmaBoundsByVar,
  sigmaMultStartByVar,
  setSigmaMultStartByVar,
  sigmaBoundsMultByVar,
  setSigmaBoundsMultByVar,
  noiseModelByVar,
  setNoiseModelByVar,
}: OptimisationSettingsProps) => {
  const [customStarting, setCustomStarting] = useState<number[]>([]);
  const [customLowerBounds, setCustomLowerBounds] = useState<number[]>([]);
  const [customUpperBounds, setCustomUpperBounds] = useState<number[]>([]);
  const [selectedSubjectGroupIds, setSelectedSubjectGroupIds] = useState<number[]>([]);
  const [selectedBiomarkerTypeIds, setSelectedBiomarkerTypeIds] = useState<number[]>([]);
  // Per-output-variable sigma start / bounds and noise model now come from props
  // (persisted in useOptimise) so they survive the dialog closing/reopening and
  // are shared with the sidebar Fit. Entries fall back to the data-derived
  // defaults (see below) / DEFAULT_NOISE_MODEL when a variable has no explicit
  // value.
  const noiseModelFor = (varId: number): NoiseModel =>
    noiseModelByVar[varId] ?? DEFAULT_NOISE_MODEL;
  const isCombinedFor = (varId: number) => noiseModelFor(varId) === "combined";

  // The distinct output variables to fit a sigma for follow the selected
  // observations, in the same canonical (ascending id) order as the backend.
  const sigmaVariables = useMemo(
    () =>
      getSigmaVariables(
        biomarkerTypes.filter((bt) => selectedBiomarkerTypeIds.includes(bt.id)),
      ),
    [biomarkerTypes, selectedBiomarkerTypeIds],
  );

  // Max absolute observed value per sigma output variable (in model units), used
  // to default each sigma's upper bound to the data scale.
  const maxObservationByVariable = useMemo(
    () =>
      getMaxObservationByVariable(
        sigmaVariables,
        subjectBiomarkers,
        variables,
        units,
        model,
      ),
    [sigmaVariables, subjectBiomarkers, variables, units, model],
  );
  const sigmaUpperDefault = (varId: number) =>
    maxObservationByVariable[varId] ?? 1;
  const sigmaStartDefault = (varId: number) => sigmaUpperDefault(varId) / 10;

  // Default "optimise in log space" for a parameter, mirroring
  // getDefaultOptimiseInputs: log space where the lower bound is non-negative
  // (log space is undefined otherwise) and there is no fixed database upper
  // bound. Used as the fallback when the user has no explicit override.
  const paramLogSpaceDefault = (variableId: number, lowerBound: number) => {
    const variable = variables.find((item) => item.id === variableId);
    const hasFixedUpperBound =
      variable?.upper_bound !== undefined && variable?.upper_bound !== null;
    return lowerBound >= 0 && !hasFixedUpperBound;
  };

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
    // method / maxIterations and all the per-variable overrides (log space,
    // sigma start/bounds, noise model) are persisted in useOptimise and
    // intentionally not reset here so they survive dialog open/close and are
    // shared with the sidebar Fit.
    setSelectedSubjectGroupIds(visibleSubjectGroupIds);
    setSelectedBiomarkerTypeIds(defaultOptimiseInputs.biomarker_types ?? []);
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
      // Log space is only valid for a non-negative lower bound; guard here so an
      // invalid combination can never reach the backend (which would 400).
      use_log_space: orderedSliders.map(
        (slider, index) =>
          (paramUseLogSpace[slider.variable] ??
            paramLogSpaceDefault(
              slider.variable,
              customLowerBounds[index] ?? 0,
            )) && (customLowerBounds[index] ?? 0) >= 0,
      ),
      max_iterations: sanitizeMaxIterations(maxIterations),
      // One noise model per output variable, in the same canonical (ascending
      // variable id) order as the sigma arrays below.
      noise_models: sigmaVariables.map((varId) => noiseModelFor(varId)),
      method,
      biomarker_types: selectedBiomarkerTypeIds,
      subject_groups: selectedSubjectGroupIds,
      // sigma start / bounds are linear and ordered by sigmaVariables (ascending
      // variable id), matching the backend's canonical output ordering.
      sigma_start: sigmaVariables.map(
        (varId) => sigmaStartByVar[varId] ?? sigmaStartDefault(varId),
      ),
      sigma_bounds: sigmaVariables.map(
        (varId) => sigmaBoundsByVar[varId] ?? [0, sigmaUpperDefault(varId)],
      ),
      sigma_use_log_space: sigmaVariables.map(
        (varId) => sigmaUseLogSpace[varId] ?? true,
      ),
      // The second (proportional, dimensionless) sigma is sent whenever any
      // observation uses the combined model. The arrays are full-length (one per
      // output variable); the backend only reads the entries for combined
      // outputs.
      ...(sigmaVariables.some((varId) => isCombinedFor(varId))
        ? {
            sigma_mult_start: sigmaVariables.map(
              (varId) => sigmaMultStartByVar[varId] ?? 0.1,
            ),
            sigma_bounds_mult: sigmaVariables.map(
              (varId) => sigmaBoundsMultByVar[varId] ?? [0, 1],
            ),
            sigma_mult_use_log_space: sigmaVariables.map(
              (varId) => sigmaMultUseLogSpace[varId] ?? true,
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" slotProps={{
      paper: { sx: { maxHeight: "calc(100vh - 128px)", mt: "64px" } }
    }}>
      <DialogTitle sx={{ fontWeight: "bold" }}>Optimisation Settings</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ marginTop: ".5rem" }}>
          {orderedSliders.map((slider, index) => {
            const variable = variables.find((item) => item.id === slider.variable);
            const label = variable?.description
              ? `${variable.name} (${variable.description})`
              : variable?.name || `Variable ${slider.variable}`;
            // Log space is undefined for negative values, so only offer it when
            // the parameter's lower bound is non-negative.
            const logSpaceDisabled = (customLowerBounds[index] ?? 0) < 0;

            return (
              <Box key={slider.variable}>
                <Typography variant="subtitle2" sx={{ marginBottom: ".5rem" }}>
                  {label}
                </Typography>
                <Stack direction="row" spacing={1} sx={{
                  alignItems: "center"
                }}>
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
                  <Tooltip
                    title={
                      logSpaceDisabled
                        ? "Log scale requires a non-negative lower bound."
                        : ""
                    }
                    placement="top"
                  >
                    <FormControlLabel
                      sx={{ whiteSpace: "nowrap" }}
                      control={
                        <Checkbox
                          size="small"
                          checked={
                            (paramUseLogSpace[slider.variable] ??
                              paramLogSpaceDefault(
                                slider.variable,
                                customLowerBounds[index] ?? 0,
                              )) && !logSpaceDisabled
                          }
                          disabled={logSpaceDisabled}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setParamUseLogSpace({
                              ...paramUseLogSpace,
                              [slider.variable]: checked,
                            });
                          }}
                        />
                      }
                      label="Log scale"
                    />
                  </Tooltip>
                </Stack>
              </Box>
            );
          })}
          <Divider />
          <Stack direction="row" sx={{
            alignItems: "center"
          }}>
            <Typography variant="subtitle2" sx={{ marginBottom: ".5rem" }}>
              Noise model and standard deviation (per observation)
            </Typography>
            <HelpButton title="Noise models" maxWidth="500px">
              <p>
                The noise model describes how the measurement error relates to
                the predicted value ŷ. Each observation is fit with its own
                model and standard deviation σ.
              </p>
              <p>
                <strong>Additive:</strong> y ~ N(ŷ, σₐ²). The error has a
                constant standard deviation σₐ regardless of the size of the
                value. Best when the measurement error is a fixed absolute
                amount.
              </p>
              <p>
                <strong>Multiplicative</strong> (default): log(y) ~ N(log(ŷ),
                σ²). The error is log-normal, so it grows in proportion to the
                predicted value. Best when the relative (percentage) error is
                roughly constant across the range of the data.
              </p>
              <p>
                <strong>Combined:</strong> y ~ N(ŷ, σₐ² + σₘ²·ŷ²). Combines an
                additive floor σₐ with a proportional term σₘ (two sigmas per
                observation). Useful when there is both a fixed error floor at
                low values and proportional scaling at higher values.
              </p>
            </HelpButton>
          </Stack>
          {sigmaVariables.length === 0 && (
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              Select at least one observation to configure its noise.
            </Typography>
          )}
          {sigmaVariables.map((varId) => {
            const variable = variables.find((item) => item.id === varId);
            const label = variable?.description
              ? `${variable.name} (${variable.description})`
              : variable?.name || `Variable ${varId}`;
            const varIsCombined = isCombinedFor(varId);
            return (
              <Box key={varId}>
                <Typography variant="body2" sx={{ marginBottom: ".25rem" }}>
                  {label}
                </Typography>
                <FormControl
                  size="small"
                  sx={{ marginBottom: ".5rem", minWidth: 200 }}
                >
                  <InputLabel id={`noise-model-${varId}-label`}>
                    Noise model
                  </InputLabel>
                  <Select
                    labelId={`noise-model-${varId}-label`}
                    label="Noise model"
                    value={noiseModelFor(varId)}
                    onChange={(event) =>
                      setNoiseModelByVar({
                        ...noiseModelByVar,
                        [varId]: event.target.value as NoiseModel,
                      })
                    }
                  >
                    <MenuItem value="additive">Additive</MenuItem>
                    <MenuItem value="multiplicative">Multiplicative</MenuItem>
                    <MenuItem value="combined">Combined</MenuItem>
                  </Select>
                </FormControl>
                <SigmaRow
                  label={varIsCombined ? "Sigma (additive)" : "Sigma"}
                  sigma={sigmaStartByVar[varId] ?? sigmaStartDefault(varId)}
                  onSigmaChange={(value) =>
                    setSigmaStartByVar({ ...sigmaStartByVar, [varId]: value })
                  }
                  bounds={
                    sigmaBoundsByVar[varId] ?? [0, sigmaUpperDefault(varId)]
                  }
                  onBoundsChange={(value) =>
                    setSigmaBoundsByVar({ ...sigmaBoundsByVar, [varId]: value })
                  }
                  useLogSpace={sigmaUseLogSpace[varId] ?? true}
                  onUseLogSpaceChange={(value) =>
                    setSigmaUseLogSpace({
                      ...sigmaUseLogSpace,
                      [varId]: value,
                    })
                  }
                />
                {varIsCombined && (
                  <Box sx={{ marginTop: ".5rem" }}>
                    <SigmaRow
                      label="Sigma (proportional)"
                      sigma={sigmaMultStartByVar[varId] ?? 0.1}
                      onSigmaChange={(value) =>
                        setSigmaMultStartByVar({
                          ...sigmaMultStartByVar,
                          [varId]: value,
                        })
                      }
                      bounds={sigmaBoundsMultByVar[varId] ?? [0, 1]}
                      onBoundsChange={(value) =>
                        setSigmaBoundsMultByVar({
                          ...sigmaBoundsMultByVar,
                          [varId]: value,
                        })
                      }
                      useLogSpace={sigmaMultUseLogSpace[varId] ?? true}
                      onUseLogSpaceChange={(value) =>
                        setSigmaMultUseLogSpace({
                          ...sigmaMultUseLogSpace,
                          [varId]: value,
                        })
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
                  <Typography variant="body2" sx={{
                    color: "text.secondary"
                  }}>
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
                  <Typography variant="body2" sx={{
                    color: "text.secondary"
                  }}>
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
            <TextField
              label="Max iterations"
              type="number"
              size="small"
              value={maxIterations}
              onChange={(event) => setMaxIterations(event.target.value)}
              // Max iterations must be a positive integer. Snap an empty or
              // out-of-range value back to a valid one on blur so the field
              // reflects what will actually be sent.
              onBlur={() =>
                setMaxIterations(String(sanitizeMaxIterations(maxIterations)))
              }
              slotProps={{ htmlInput: { min: 1, step: 1 } }}
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
