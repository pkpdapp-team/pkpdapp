import {
  Box,
  Typography,
  Divider,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  Collapse,
  CircularProgress,
  Stack,
  Badge,
  IconButton,
  Tooltip,
} from "@mui/material";
import { createPortal } from "react-dom";
import DropdownButton from "../../components/DropdownButton";
import FloatField from "../../components/FloatField";
import UnitField from "../../components/UnitField";
import SimulationSliderView from "./SimulationSliderView";
import HelpButton from "../../components/HelpButton";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import Settings from "@mui/icons-material/Settings";
import Visibility from "@mui/icons-material/Visibility";
import { ChangeEvent, useState } from "react";
import { getTableHeight } from "../../shared/calculateTableHeights";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import useDataset from "../../hooks/useDataset";
import { PageName } from "../main/mainSlice";
import {
  CombinedModelRead,
  BiomarkerTypeRead,
  CompoundRead,
  Simulation,
  SimulationPlot,
  SimulationRead,
  SimulationSlider,
  SubjectGroupRead,
  VariableRead,
  Optimise,
  OptimiseResponse,
} from "../../app/backendApi";
import { UnitReadWithCompatible } from "../../shared/unitConversion";
import { Control } from "react-hook-form";
import { useCollapsibleSidebar } from "../../shared/contexts/CollapsibleSidebarContext";
import OptimisationSettings from "./OptimisationSettings";
import OptimisationView from "./OptimisationView";
import { NoiseModel } from "./useOptimise";
import { getPlottedBiomarkerTypes } from "./utils";
import "../../App.css";

type SimulationsSidePanelType = {
  portalId: string;
  addPlotOptions: {
    value: number;
    label: string;
  }[];
  handleAddPlot: (plot: number) => void;
  isSharedWithMe: boolean;
  layoutOptions: { value: string; label: string }[];
  layout: string[];
  setLayout: (layout: string[]) => void;
  plots: SimulationPlot[];
  control: Control<Simulation, unknown>;
  units: UnitReadWithCompatible[];
  simulation: SimulationRead;
  model: CombinedModelRead;
  compound: CompoundRead;
  groups?: SubjectGroupRead[];
  visibleGroups: string[];
  handleVisibleGroups: (group: ChangeEvent<HTMLInputElement>) => void;
  addSliderOptions: {
    value: number;
    label: string;
  }[];
  handleAddSlider: (slider: number) => void;
  orderedSliders: (SimulationSlider & { fieldArrayIndex: number })[];
  getSliderValue: (variableId: number, variable?: VariableRead) => number;
  getSliderBounds: (variableId: number, variable?: VariableRead) => [number, number];
  handleChangeSlider: (variable: number, value: number) => void;
  handleWidenSlider: (variableId: number) => void;
  handleNarrowSlider: (variableId: number) => void;
  handleRemoveSlider: (index: number, variableId: number) => () => void;
  handleSaveAllSlider: () => void;
  handleOptimise: () => void;
  handleOptimiseWithInputs: (optimiseInputs: Optimise) => void;
  visibleSubjectGroupIds: number[];
  loadingOptimise: boolean;
  optimiseMethod: string;
  setOptimiseMethod: (method: string) => void;
  maxIterations: string;
  setMaxIterations: (maxIterations: string) => void;
  // Per-variable log-space overrides, persisted in useOptimise so they survive
  // the OptimisationSettings dialog closing/reopening.
  paramUseLogSpace: Record<number, boolean>;
  setParamUseLogSpace: (value: Record<number, boolean>) => void;
  sigmaUseLogSpace: Record<number, boolean>;
  setSigmaUseLogSpace: (value: Record<number, boolean>) => void;
  sigmaMultUseLogSpace: Record<number, boolean>;
  setSigmaMultUseLogSpace: (value: Record<number, boolean>) => void;
  // Per-output-variable sigma start / bounds and noise-model overrides,
  // persisted in useOptimise so they survive the dialog closing/reopening and
  // are honoured by the sidebar Fit button.
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
  optimiseResult: OptimiseResponse | null;
  exportSimulation: () => void;
  showReference: boolean;
  setShowReference: (reference: boolean) => void;
  useLegacySolver: boolean;
  setUseLegacySolver: (useLegacySolver: boolean) => void;
  shouldShowLegend: boolean;
  setShouldShowLegend: (value: boolean) => void;
  variables: VariableRead[];
  biomarkerTypes: BiomarkerTypeRead[];
};

const ButtonSx = {
  transition: "all .35s linear",
  color: "#544f4f",
  backgroundColor: "transparent",
  "&:hover": {
    backgroundColor: "transparent",
  },
  borderBottom: "1px solid #dbd6d1",
  borderRadius: 0,
  width: "12rem",
  textTransform: "capitalize",
  display: "flex",
  justifyContent: "flex-start",
};

const SidePanelSteps = [
  {
    minHeight: 1100,
    tableHeight: "75vh",
  },
  {
    minHeight: 1000,
    tableHeight: "72vh",
  },
  {
    minHeight: 900,
    tableHeight: "70vh",
  },
  {
    minHeight: 800,
    tableHeight: "65vh",
  },
  {
    minHeight: 700,
    tableHeight: "60vh",
  },
  {
    minHeight: 600,
    tableHeight: "55vh",
  },
  {
    minHeight: 500,
    tableHeight: "50vh",
  },
  {
    minHeight: 400,
    tableHeight: "40vh",
  },
  {
    minHeight: 300,
    tableHeight: "30vh",
  },
];

const AccordionButton = ({
  children = null,
  expanded = false,
  onClick,
  title,
}: {
  children?: React.ReactNode;
  expanded?: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  title: string;
}) => {
  return (
    <Button
      sx={ButtonSx}
      disableTouchRipple
      disableElevation
      onClick={onClick}
      startIcon={expanded ? <ExpandLess /> : <ExpandMore />}
      aria-expanded={expanded}
    >
      <Typography component="span">{title}</Typography>
      {children}
    </Button>
  );
};

export const SimulationsSidePanel = ({
  portalId,
  addPlotOptions,
  handleAddPlot,
  isSharedWithMe,
  layoutOptions,
  layout,
  setLayout,
  plots,
  control,
  units,
  simulation,
  groups,
  visibleGroups,
  handleVisibleGroups,
  model,
  compound,
  addSliderOptions,
  handleAddSlider,
  orderedSliders,
  getSliderValue,
  getSliderBounds,
  handleChangeSlider,
  handleWidenSlider,
  handleNarrowSlider,
  handleRemoveSlider,
  handleSaveAllSlider,
  handleOptimise,
  handleOptimiseWithInputs,
  visibleSubjectGroupIds,
  loadingOptimise,
  optimiseMethod,
  setOptimiseMethod,
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
  optimiseResult,
  exportSimulation,
  showReference,
  setShowReference,
  useLegacySolver,
  setUseLegacySolver,
  shouldShowLegend,
  setShouldShowLegend,
  variables,
  biomarkerTypes,
}: SimulationsSidePanelType) => {
  const selectedPage = useSelector(
    (state: RootState) => state.main.selectedPage,
  );
  const selectedProject = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const { dataset, subjectBiomarkers } = useDataset(selectedProject);
  const hasData = !!dataset && subjectBiomarkers.some((bm) => bm.length > 0);
  // Whether any observed variable is plotted — i.e. the default optimisation
  // observation set is non-empty. Without this, "Fit" would call the backend
  // with zero observations and error out.
  const hasObservationsToFit =
    getPlottedBiomarkerTypes(plots, biomarkerTypes).length > 0;
  const fitDisabled =
    isSharedWithMe ||
    loadingOptimise ||
    orderedSliders.length < 1 ||
    !hasData ||
    !hasObservationsToFit;
  // Explain why fitting is disabled (and how to enable it) via a tooltip.
  // Empty while loading or enabled so no tooltip is shown then.
  const fitDisabledReason = isSharedWithMe
    ? "This project is read-only, so optimisation is disabled."
    : orderedSliders.length < 1
      ? "Add at least one parameter slider to fit."
      : !hasData
        ? "This project has no observation data to fit against. Add a dataset with observations."
        : !hasObservationsToFit
          ? "No observed variables are plotted. Add an observed variable to a plot y-axis to fit against it."
          : "";
  const portalRoot = document.getElementById(portalId);
  const [collapseLayout, setCollapseLayout] = useState(false);
  const [collapseOptions, setCollapseOptions] = useState(false);
  const [collapseGroups, setCollapseGroups] = useState(false);
  const [collapseParameters, setCollapseParameters] = useState(false);
  const [collapseReference, setCollapseReference] = useState(false);
  const [collapseLegend, setCollapseLegend] = useState(false);
  const [optimiseSettingsOpen, setOptimiseSettingsOpen] = useState(false);
  const [optimiseViewOpen, setOptimiseViewOpen] = useState(false);
  const { simulationAnimationClasses } = useCollapsibleSidebar();

  const onLayoutChange = (value: string) => {
    if (layout.includes(value)) {
      setLayout(layout.filter((layoutValue) => value !== layoutValue));
    } else {
      setLayout(layout?.length ? [] : [value]);
    }
  };

  if (!portalRoot || selectedPage !== PageName.SIMULATIONS) return null;

  return (
    <>
      {createPortal(
        <Box
          className={simulationAnimationClasses}
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "100%",
            maxHeight: "100%",
            paddingBottom: "1rem",
            backgroundColor: "#FBFBFA",
            borderRight: "1px solid #DBD6D1",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-start",
              padding: "1rem 0 1rem 1rem",
            }}
          >
            <Box
              sx={{
                paddingTop: "5rem",
                display: "flex",
                alignItems: "center",
                flexDirection: "column",
                width: "100%",
              }}
            >
              <Typography variant="h4">Simulations</Typography>
              <DropdownButton
                sx={{ width: "12rem", marginTop: ".5  rem" }}
                useIcon={false}
                data_cy="add-plot"
                options={addPlotOptions}
                onOptionSelected={handleAddPlot}
                disabled={isSharedWithMe}
              >
                Add new plot
              </DropdownButton>
              <Divider
                sx={{ paddingTop: "1rem", width: "11rem" }}
                variant="middle"
              />
              <Box
                sx={{
                  overflowX: "hidden",
                  overflowY: "auto",
                  maxHeight: getTableHeight({ steps: SidePanelSteps }),
                  alignSelf: "stretch",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Box>
                    <AccordionButton
                      expanded={collapseLayout}
                      onClick={() => setCollapseLayout(!collapseLayout)}
                      title="Figures Layout"
                    />
                    <Collapse
                      sx={{
                        transition: "all .35s ease-in",
                        marginBottom: ".5rem",
                      }}
                      timeout={350}
                      easing="ease-in"
                      in={collapseLayout}
                      component="div"
                    >
                      <FormGroup>
                        {layoutOptions.map(({ value, label }) => (
                          <FormControlLabel
                            key={value}
                            control={
                              <Checkbox
                                checked={layout.includes(value)}
                                onChange={() => {
                                  onLayoutChange(value);
                                }}
                              />
                            }
                            label={label}
                          />
                        ))}
                      </FormGroup>
                    </Collapse>
                  </Box>
                  <Box>
                    <AccordionButton
                      expanded={collapseOptions}
                      onClick={() => setCollapseOptions(!collapseOptions)}
                      title="Simulation Options"
                    />
                    <Collapse
                      sx={{
                        transition: "all .35s ease-in",
                        marginBottom: ".5rem",
                      }}
                      timeout={350}
                      easing="ease-in"
                      in={collapseOptions}
                      component="div"
                    >
                      {plots.length > 0 && (
                        <>
                          <Stack
                            direction={"column"}
                            spacing={2}
                            sx={{
                              alignItems: "center",
                              justifyContent: "flex-start",
                              paddingTop: "1rem"
                            }}>
                            <FloatField
                              sx={{ width: "11rem" }}
                              label="Simulation Duration"
                              name="time_max"
                              control={control}
                              textFieldProps={{ disabled: isSharedWithMe }}
                            />
                            <UnitField
                              sx={{ width: "11rem" }}
                              label="Unit"
                              name="time_max_unit"
                              baseUnit={units.find(
                                (u) => u.id === simulation?.time_max_unit,
                              )}
                              control={control}
                              selectProps={{
                                disabled: isSharedWithMe,
                              }}
                            />
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={useLegacySolver}
                                  onChange={(event) =>
                                    setUseLegacySolver(event.target.checked)
                                  }
                                />
                              }
                              label="Use legacy solver"
                            />
                          </Stack>
                        </>
                      )}
                    </Collapse>
                  </Box>
                  <Box>
                    {!!groups?.length && (
                      <>
                        <AccordionButton
                          expanded={collapseGroups}
                          onClick={() => setCollapseGroups(!collapseGroups)}
                          title="Groups"
                        >
                          <Badge
                            sx={{ marginLeft: "auto", marginRight: "1rem" }}
                            badgeContent={visibleGroups?.length}
                            color="primary"
                          />
                        </AccordionButton>
                        <Collapse
                          sx={{
                            transition: "all .35s ease-in",
                            marginBottom: ".5rem",
                          }}
                          timeout={350}
                          easing="ease-in"
                          in={collapseGroups}
                          component="div"
                        >
                          <FormGroup>
                            {groups?.map((group) => (
                              <FormControlLabel
                                key={group.name}
                                control={
                                  <Checkbox
                                    checked={visibleGroups.includes(group.name)}
                                    value={group.name}
                                    onChange={handleVisibleGroups}
                                  />
                                }
                                label={group.name}
                              />
                            ))}
                          </FormGroup>
                        </Collapse>
                      </>
                    )}
                  </Box>
                  <Box sx={{ width: "11rem" }}>
                    <AccordionButton
                      expanded={collapseReference}
                      onClick={() => setCollapseReference(!collapseReference)}
                      title="Reference"
                    />
                    <Collapse
                      sx={{
                        transition: "all .35s ease-in",
                        marginBottom: ".5rem",
                      }}
                      timeout={350}
                      easing="ease-in"
                      in={collapseReference}
                      component="div"
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={showReference}
                            onChange={(e) => setShowReference(e.target.checked)}
                          ></Checkbox>
                        }
                        label="Show reference"
                      />
                    </Collapse>
                  </Box>
                  <Box sx={{ width: "11rem" }}>
                    <AccordionButton
                      expanded={collapseLegend}
                      onClick={() => setCollapseLegend(!collapseLegend)}
                      title="Legend"
                    />
                    <Collapse
                      sx={{
                        transition: "all .35s ease-in",
                        marginBottom: ".5rem",
                      }}
                      timeout={350}
                      easing="ease-in"
                      in={collapseLegend}
                      component="div"
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={shouldShowLegend}
                            onChange={(e) =>
                              setShouldShowLegend(e.target.checked)
                            }
                          ></Checkbox>
                        }
                        label="Show Legend"
                      />
                    </Collapse>
                  </Box>
                  <Box sx={{ width: "11rem" }}>
                    <AccordionButton
                      expanded={collapseParameters}
                      onClick={() => setCollapseParameters(!collapseParameters)}
                      title="Parameters"
                    >
                      <Badge
                        sx={{ marginLeft: "auto", marginRight: "1rem" }}
                        badgeContent={orderedSliders?.length}
                        color="primary"
                      />
                    </AccordionButton>
                    <Collapse
                      sx={{
                        transition: "all .35s ease-in",
                        marginBottom: ".5rem",
                      }}
                      timeout={350}
                      easing="ease-in"
                      in={collapseParameters}
                      component="div"
                    >
                      <DropdownButton
                        variant="outlined"
                        sx={{ width: "12rem", marginTop: ".5rem" }}
                        useIcon={false}
                        options={addSliderOptions}
                        onOptionSelected={handleAddSlider}
                        data_cy="add-parameter-slider"
                        disabled={isSharedWithMe}
                      >
                        Add Parameter
                      </DropdownButton>
                      {orderedSliders.map((slider, index) => (
                        <SimulationSliderView
                          key={index}
                          index={index}
                          slider={slider}
                          model={model}
                          getSliderValue={getSliderValue}
                          getSliderBounds={getSliderBounds}
                          onChange={handleChangeSlider}
                          onWiden={handleWidenSlider}
                          onNarrow={handleNarrowSlider}
                          onRemove={handleRemoveSlider(
                            slider.fieldArrayIndex,
                            slider.variable,
                          )}
                          units={units}
                        />
                      ))}
                      <Button
                        variant="outlined"
                        sx={{ width: "12rem", marginTop: ".5rem" }}
                        onClick={handleSaveAllSlider}
                        disabled={isSharedWithMe}
                      >
                        Save All Sliders
                      </Button>
                      <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{
                          alignItems: "center",
                          marginTop: ".5rem"
                        }}>
                        <Tooltip title={fitDisabledReason} placement="top">
                          <span>
                            <Button
                              variant="outlined"
                              onClick={handleOptimise}
                              disabled={fitDisabled}
                              data-cy="optimise-parameters"
                            >
                              Fit
                            </Button>
                          </span>
                        </Tooltip>
                        <Tooltip title="Optimisation settings" placement="top">
                          <span>
                            <IconButton
                              aria-label="Open optimisation settings"
                              onClick={() => setOptimiseSettingsOpen(true)}
                              disabled={fitDisabled}
                              sx={{ border: "1px solid #DBD7D3", borderRadius: "4px" }}
                              data-cy="optimise-settings"
                            >
                              <Settings fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="View last optimisation result" placement="top">
                          <span>
                            <IconButton
                              aria-label="View optimisation result"
                              onClick={() => setOptimiseViewOpen(true)}
                              disabled={!optimiseResult}
                              sx={{ border: "1px solid #DBD7D3", borderRadius: "4px" }}
                              data-cy="optimise-view"
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <HelpButton title="Optimisation" placement="right" maxWidth="500px">
                          <p>
                            The optimiser fits model parameters to observed data by minimising a
                            negative log-likelihood (NLL):
                          </p>
                          <p style={{ fontFamily: "monospace", margin: "0.5rem 0" }}>
                            NLL = Σₖ ( Nₖ · log(σₖ) + SSRₖ / (2σₖ²) )
                          </p>
                          <p>
                            where the sum is over each observed output variable k, Nₖ is the
                            number of observations of variable k, σₖ = exp(log_sigmaₖ) is its
                            noise standard deviation (fitted independently per variable), and
                            SSRₖ is its sum of squared residuals.
                          </p>
                          <p>
                            The <strong>combined</strong> noise model instead has a
                            per-observation variance that depends on the prediction ŷ
                            (σ_a² + σ_m²·ŷ²), so its NLL is accumulated point by point as
                            Σ ( ½·log(σ²ᵢ) + rᵢ²/(2σ²ᵢ) ) rather than factored per variable.
                          </p>
                          <p><strong>Parameters:</strong></p>
                          <p>
                            All the slider parameters are optimised jointly, please remove or add a slider if you want to change what model parameters are included in the optimisation.
                            The bounds for each parameter are by default set to the slider range, you can widen or narrow the slider range to change the bounds, or you can set custom bounds
                            in the optimisation settings.
                          </p>
                          <p><strong>Data:</strong></p>
                          <p>
                            All the data from all of the visible groups are included by default in the optimisation, please change the visible groups if you want to change what group data is included.
                            You can also customise which groups and which observations are included in the optimisation settings.
                          </p>
                          <p><strong>Optimisation configuration:</strong></p>
                          <p>
                            The default configuration is indicated below with a *, you can change this in the optimisation settings by clicking the settings icon next to the Fit button.
                          </p>
                          <p><strong>Noise models:</strong> for an observation y with model prediction ŷ:</p>
                          <ul style={{ margin: "0.25rem 0", paddingLeft: "1.5rem" }}>
                            <li><strong>Additive:</strong> y ~ N(ŷ, σ²) — constant noise, one σ per variable</li>
                            <li><strong>Multiplicative (log-normal)*:</strong> log(y) ~ N(log(ŷ), σ²)</li>
                            <li><strong>Combined:</strong> y ~ N(ŷ, σ_a² + σ_m²·ŷ²) — additive plus proportional noise</li>
                          </ul>
                          <p><strong>Available methods:</strong></p>
                          <ul style={{ margin: "0.25rem 0", paddingLeft: "1.5rem" }}>
                            <li><strong>PSO*</strong> – Particle Swarm Optimisation (gradient-free)</li>
                            <li><strong>CMA-ES</strong> – Covariance Matrix Adaptation (gradient-free)</li>
                            <li><strong>Nelder-Mead</strong> – Simplex method (gradient-free)</li>
                          </ul>
                          <p><strong>Diagnostics (click the eye icon):</strong></p>
                          <ul style={{ margin: "0.25rem 0", paddingLeft: "1.5rem" }}>
                            <li>Parameters near bounds are highlighted in red</li>
                            <li>Covariance matrix estimated as (Jᵀ W J)⁻¹ where J is the Jacobian and W = diag(1/σₖ²) weights each observation by its output variable&apos;s noise</li>
                            <li>%RSE (relative standard error) shown on diagonal</li>
                            <li>Correlation matrix computed as Corr[i,j] = Cov[i,j] / (√Cov[i,i] · √Cov[j,j]), shown off-diagonal</li>
                            <li>Condition number (κ = s_max / s_min from SVD of correlation matrix) indicates parameter identifiability</li>
                          </ul>
                        </HelpButton>
                        {loadingOptimise && (
                          <CircularProgress size={20} aria-label="Optimising" />
                        )}
                      </Stack>
                    </Collapse>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Button variant="contained" onClick={exportSimulation}>
              Export to CSV
            </Button>
            <HelpButton title={"Export to CSV"}>
              A variables are reported in pmol, C or T variables are reported in
              pmol/L and AUC variables are reported in pmol/L*h. These units
              cannot be changed in the current version.
            </HelpButton>
          </Box>
          <OptimisationSettings
            open={optimiseSettingsOpen}
            onClose={() => setOptimiseSettingsOpen(false)}
            orderedSliders={orderedSliders}
            variables={variables}
            getSliderValue={getSliderValue}
            getSliderBounds={getSliderBounds}
            onOptimise={handleOptimiseWithInputs}
            loadingOptimise={loadingOptimise}
            method={optimiseMethod}
            setMethod={setOptimiseMethod}
            maxIterations={maxIterations}
            setMaxIterations={setMaxIterations}
            paramUseLogSpace={paramUseLogSpace}
            setParamUseLogSpace={setParamUseLogSpace}
            sigmaUseLogSpace={sigmaUseLogSpace}
            setSigmaUseLogSpace={setSigmaUseLogSpace}
            sigmaMultUseLogSpace={sigmaMultUseLogSpace}
            setSigmaMultUseLogSpace={setSigmaMultUseLogSpace}
            sigmaStartByVar={sigmaStartByVar}
            setSigmaStartByVar={setSigmaStartByVar}
            sigmaBoundsByVar={sigmaBoundsByVar}
            setSigmaBoundsByVar={setSigmaBoundsByVar}
            sigmaMultStartByVar={sigmaMultStartByVar}
            setSigmaMultStartByVar={setSigmaMultStartByVar}
            sigmaBoundsMultByVar={sigmaBoundsMultByVar}
            setSigmaBoundsMultByVar={setSigmaBoundsMultByVar}
            noiseModelByVar={noiseModelByVar}
            setNoiseModelByVar={setNoiseModelByVar}
            plots={plots}
            biomarkerTypes={biomarkerTypes}
            groups={groups ?? []}
            visibleSubjectGroupIds={visibleSubjectGroupIds}
            subjectBiomarkers={subjectBiomarkers}
            units={units}
            model={model}
          />
          <OptimisationView
            open={optimiseViewOpen}
            onClose={() => setOptimiseViewOpen(false)}
            optimiseResult={optimiseResult}
            variables={variables}
            units={units}
            groups={groups}
            biomarkerTypes={biomarkerTypes}
            subjectBiomarkers={subjectBiomarkers}
            model={model}
            compound={compound}
            visibleGroups={visibleGroups}
            plots={plots}
          />
        </Box>,
        portalRoot,
      )}
    </>
  );
};
