import {
  Alert,
  Grid,
  Snackbar,
  Box,
  debounce,
  Typography,
} from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  CombinedModelRead,
  CompoundRead,
  Optimise,
  OptimiseResponse,
  ProjectRead,
  Simulation,
  SimulationPlotRead,
  SimulationRead,
  SimulationSliderRead,
  SubjectGroupRead,
  UnitRead,
  VariableRead,
  useCombinedModelListQuery,
  useCompoundRetrieveQuery,
  useProjectRetrieveQuery,
  useSimulationListQuery,
  useSimulationUpdateMutation,
  useUnitListQuery,
  useVariableListQuery,
  useVariableUpdateMutation,
} from "../../app/backendApi";
import { useFieldArray, useForm } from "react-hook-form";
import {
  ChangeEvent,
  FC,
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import SimulationPlotView from "./SimulationPlotView";
import useOptimise from "./useOptimise";
import useSimulation from "./useSimulation";
import useSimulationInputs from "./useSimulationInputs";
import useDirty from "../../hooks/useDirty";
import paramPriority from "../model/parameters/paramPriority";
import { selectIsProjectShared } from "../login/loginSlice";
import { useConstVariables } from "../model/parameters/getConstVariables";
import useSubjectGroups from "../../hooks/useSubjectGroups";
import useExportSimulation from "./useExportSimulation";
import { SimulationsSidePanel } from "./SimulationsSidePanel";
import parameterDisplayName from "../model/parameters/parameterDisplayName";
import {
  filterOutputs,
  getDefaultOptimiseInputs,
  getYAxisOptions,
  renameVariable,
} from "./utils";
import useSliderSettings from "./useSliderSettings";

interface ErrorObject {
  error: string;
}

function addPlotVariableOption(variable: VariableRead) {
  return {
    value: variable.id,
    label: variable.description
      ? `${variable.name} (${variable.description})`
      : variable.name,
  };
}


interface UseSimulationDataProps {
  model?: CombinedModelRead;
  simulation?: SimulationRead;
  sliderValues?: Map<number, number>;
  getSliderValue?: (variableId: number, variable?: VariableRead) => number;
  variables?: VariableRead[];
  units?: UnitRead[];
  showReference?: boolean;
}

function useSimulationData({
  model,
  simulation,
  sliderValues,
  getSliderValue,
  variables,
  units,
  showReference = false,
}: UseSimulationDataProps) {
  // generate a simulation if slider values change
  const getTimeMax = (sim: SimulationRead): number => {
    const timeMaxUnit = units?.find((u) => u.id === sim.time_max_unit);
    const compatibleTimeUnit = timeMaxUnit?.compatible_units?.find(
      (u) => parseInt(u.id) === model?.time_unit,
    );
    const timeMaxConversionFactor = compatibleTimeUnit
      ? parseFloat(compatibleTimeUnit.conversion_factor)
      : 1.0;
    const timeMax = (sim?.time_max || 0) * timeMaxConversionFactor;
    return timeMax;
  };
  const timeMax = simulation?.id && getTimeMax(simulation);
  const simInputs = useSimulationInputs(
    model,
    simulation,
    sliderValues,
    getSliderValue,
    variables,
    timeMax,
  );
  const hasPlots = simulation ? simulation.plots.length > 0 : false;
  const hasSecondaryParameters = model
    ? model.derived_variables.reduce((acc, dv) => {
      return acc || dv.type === "AUC";
    }, false)
    : false;

  const {
    loadingSimulate,
    data,
    error: simulateError,
  } = useSimulation(simInputs, model, hasPlots || hasSecondaryParameters);

  const refSimInputs = useSimulationInputs(
    model,
    simulation,
    undefined,
    undefined,
    variables,
    timeMax,
  );
  const { data: dataReference } = useSimulation(
    refSimInputs,
    showReference ? model : undefined,
  );
  return { loadingSimulate, simInputs, data, simulateError, dataReference };
}

interface SimulationsTabProps {
  groups?: SubjectGroupRead[];
  project: ProjectRead;
  compound: CompoundRead;
  model: CombinedModelRead;
  variables: VariableRead[];
  simulation: SimulationRead;
  units: UnitRead[];
}

const SimulationsTab: FC<SimulationsTabProps> = ({
  groups = [],
  project,
  compound,
  model,
  variables,
  simulation,
  units,
}) => {
  const groupNames = useMemo(
    () => ["Sim-Group 1", ...groups.map((group) => group.name)],
    [groups],
  );
  const initialGroupVisibility: { [key: string]: boolean } = {};
  groupNames.forEach((groupName) => {
    initialGroupVisibility[groupName] = true;
  });
  const [groupVisibility, setGroupVisibility] = useState<{
    [key: string]: boolean;
  }>(initialGroupVisibility);
  const visibleGroups = Object.keys(groupVisibility).filter(
    (key: string) => groupVisibility[key],
  );
  const visibleSubjectGroupIds = useMemo(
    () =>
      groups
        .filter((group) => visibleGroups.includes(group.name))
        .map((group) => group.id),
    [groups, visibleGroups],
  );
  const [showReference, setShowReference] = useState<boolean>(false);
  useEffect(() => {
    setGroupVisibility((prevState) => {
      const newState: Record<string, boolean> = {};
      groupNames.forEach((groupName) => {
        // Visibility is previous visibility state or true if not set yet.
        newState[groupName] =
          prevState[groupName] === undefined ? true : prevState[groupName];
      });
      return newState;
    });
  }, [groupNames]);
  const [updateSimulation] = useSimulationUpdateMutation();
  const [updateVariable] = useVariableUpdateMutation();
  const constVariables = useConstVariables();

  const {
    setSliderValues,
    handleChangeSlider,
    addSlider,
    removeSliderSettings,
    initialiseSliderSettings,
    getSliderValue,
    getSliderBounds,
    widenSliderRange,
    narrowSliderRange,
  } = useSliderSettings();
  const [optimiseResult, setOptimiseResult] =
    useState<OptimiseResponse | null>(null);
  const [optimiseResultOpen, setOptimiseResultOpen] = useState(false);
  const [optimiseError, setOptimiseError] = useState<ErrorObject | null>(null);
  const [shouldShowLegend, setShouldShowLegend] = useState(true);
  const isSharedWithMe = useSelector((state: RootState) =>
    selectIsProjectShared(state, project),
  );
  const { optimiseModel, loadingOptimise } = useOptimise(model);

  const defaultSimulation: SimulationRead = {
    id: 0,
    name: "default",
    sliders: [],
    plots: [],
    nrows: 0,
    ncols: 0,
    project: project.id,
    time_max_unit: model?.time_unit || 0,
  };

  const { loadingSimulate, simInputs, data, simulateError, dataReference } =
    useSimulationData({
      model,
      simulation,
      sliderValues: undefined,
      getSliderValue,
      variables,
      units,
      showReference,
    });

  const {
    reset,
    handleSubmit,
    control,
    formState: { isDirty, submitCount },
    setValue,
  } = useForm<Simulation>({
    defaultValues: simulation || defaultSimulation,
  });
  useDirty(isDirty || loadingSimulate);

  const {
    fields: sliders,
    append: addSimulationSlider,
    remove: removeSlider,
  } = useFieldArray({
    control,
    name: "sliders",
  });

  const {
    fields: plots,
    append: addSimulationPlot,
    remove: removePlot,
  } = useFieldArray({
    control,
    name: "plots",
  });

  const layoutOptions = [
    { value: "vertical", label: "Vertical" },
    { value: "horizontal", label: "Horizontal" },
  ];
  const [layout, setLayout] = useState<string[]>([]);

  // reset form and sliders if simulation changes
  useEffect(() => {
    if (simulation && variables) {
      initialiseSliderSettings(simulation, variables);
      //setLoadingSimulate(true);
      reset(simulation);
    }
  }, [
    initialiseSliderSettings,
    reset,
    simulation,
    variables,
  ]);

  const [exportSimulation, { error: exportSimulateErrorBase }] =
    useExportSimulation({
      simInputs,
      model,
      project,
    });
  const exportSimulateError: ErrorObject | undefined = exportSimulateErrorBase
    ? "data" in exportSimulateErrorBase
      ? (exportSimulateErrorBase.data as ErrorObject)
      : { error: "Unknown error" }
    : undefined;

  // Save simulation if dirty and not already saved.
  useEffect(() => {
    const onSubmit = (dta: Simulation) => {
      for (let i = 0; i < dta.plots.length; i++) {
        // @ts-expect-error empty string keeps getting in, so convert to null
        if (dta.plots[i].min === "") {
          dta.plots[i].min = null;
        }
        // @ts-expect-error empty string keeps getting in, so convert to null
        if (dta.plots[i].max === "") {
          dta.plots[i].max = null;
        }
        // @ts-expect-error empty string keeps getting in, so convert to null
        if (dta.plots[i].min2 === "") {
          dta.plots[i].min2 = null;
        }
        // @ts-expect-error empty string keeps getting in, so convert to null
        if (dta.plots[i].max2 === "") {
          dta.plots[i].max2 = null;
        }
      }
      updateSimulation({ id: simulation?.id || 0, simulation: dta });
    };

    if (simulation && isDirty && submitCount === 0) {
      const submit = handleSubmit(onSubmit);
      submit();
    }
  }, [handleSubmit, isDirty, submitCount, simulation, updateSimulation]);

  const outputs = filterOutputs(model, variables || []);
  const outputsSorted = outputs.map((variable) => {
    if (variable.name.startsWith("C")) {
      return { ...variable, priority: 3 };
    } else if (variable.name.startsWith("E")) {
      return { ...variable, priority: 2 };
    } else if (variable.name.startsWith("TS")) {
      return { ...variable, priority: 1 };
    } else if (variable.name.startsWith("RO_model")) {
      return { ...variable, priority: 0 };
    } else if (variable.name.startsWith("calc_")) {
      return { ...variable, priority: -1 };
    } else if (variable.name.startsWith("AUC")) {
      return { ...variable, priority: -2 };
    } else {
      return { ...variable, priority: -3 };
    }
  });

  outputsSorted.sort((a, b) => b.priority - a.priority);

  const addPlotOptions = outputsSorted.map((variable) =>
    addPlotVariableOption(renameVariable(variable, model)),
  );

  const handleAddPlot = (variableId: number) => {
    const variable = variables?.find((v) => v.id === variableId);
    if (!variable) {
      return;
    }
    const defaultXUnit =
      units?.find((unit: UnitRead) => unit.symbol === "h")?.id || 0;
    const { unit: defaultYUnit, scale: defaultYScale } = getYAxisOptions(
      compound,
      variable,
      units,
    );
    const defaultPlot: SimulationPlotRead = {
      id: 0,
      y_axes: [
        {
          id: 0,
          variable: variable.id,
        },
      ],
      cx_lines: [],
      index: 0,
      x_unit: defaultXUnit,
      y_unit: defaultYUnit,
      y_unit2: null,
      y_scale: defaultYScale,
    };
    addSimulationPlot(defaultPlot);
  };

  const orderedSliders = sliders.map((slider, i) => {
    const variable = variables?.find((v) => v.id === slider.variable);
    return {
      ...slider,
      priority: variable ? paramPriority(variable) : 0,
      fieldArrayIndex: i,
    };
  });
  orderedSliders.sort((a, b) => a.priority - b.priority);

  const handleVisibleGroups = (event: ChangeEvent<HTMLInputElement>) => {
    const groupName = event.target.value;
    setGroupVisibility((prevState) => ({
      ...prevState,
      [groupName]: !prevState[groupName],
    }));
  };

  const sliderVarIds = sliders.map((v) => v.variable);
  const addSliderOptions = constVariables
    .filter((v) => !sliderVarIds.includes(v.id))
    .map((variable) => ({
      value: variable.id,
      label: `${parameterDisplayName(variable, model)} (${variable.description})`,
    }));

  const handleAddSlider = (variableId: number) => {
    const defaultSlider: SimulationSliderRead = {
      id: 0,
      variable: variableId,
    };
    addSimulationSlider(defaultSlider);

    const variable = variables.find((item) => item.id === variableId);
    addSlider(variableId, variable);
  };

  const handleRemoveSlider = (index: number, variableId: number) => () => {
    removeSlider(index);
    removeSliderSettings(variableId);
  };

  const handleSaveAllSlider = () => {
    for (const slider of sliders) {
      const variable = variables?.find((v) => v.id === slider.variable);
      if (!variable) {
        return;
      }
      const value = getSliderValue(slider.variable, variable);
      updateVariable({
        id: slider.variable,
        variable: { ...variable, default_value: value },
      });
    }
  };

  const handleOptimiseWithInputs = useCallback(async (optimiseInputs: Optimise) => {
    if (!model) {
      setOptimiseError({ error: "Model not found" });
      return;
    }

    if (optimiseInputs.inputs.length < 1) {
      setOptimiseError({ error: "At least one slider is required to optimise." });
      return;
    }

    setOptimiseError(null);

    const response = await optimiseModel({
      ...optimiseInputs,
      subject_groups: visibleSubjectGroupIds,
    });

    if (response.error) {
      setOptimiseError(response.error);
      return;
    }

    if (!response.data || response.data.optimal.length !== optimiseInputs.inputs.length) {
      setOptimiseError({
        error: "Optimise response did not match the selected sliders.",
      });
      return;
    }

    setSliderValues((currentSliderValues) => {
      const nextSliderValues = new Map(currentSliderValues);
      optimiseInputs.inputs.forEach((variableId, index) => {
        nextSliderValues.set(variableId, response.data!.optimal[index]);
      });
      return nextSliderValues;
    });
    setOptimiseResult(response.data);
    setOptimiseResultOpen(true);
  }, [
    model,
    optimiseModel,
    setSliderValues,
    visibleSubjectGroupIds,
  ]);

  const handleOptimise = useCallback(() => {
    handleOptimiseWithInputs(
      getDefaultOptimiseInputs({
        orderedSliders,
        variables,
        getSliderValue,
        getSliderBounds,
      }),
    );
  }, [
    orderedSliders,
    variables,
    getSliderValue,
    getSliderBounds,
    handleOptimiseWithInputs,
  ]);

  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const containerRef: MutableRefObject<HTMLElement | null> = useRef(null);

  useEffect(() => {
    const debouncedHandleResize = debounce(function handleResize() {
      setDimensions({
        width: containerRef?.current?.clientWidth || 0,
        height: containerRef?.current?.clientHeight || 0,
      });
    }, 1000);

    window.addEventListener("resize", debouncedHandleResize);
    window.addEventListener("eventCollapse", debouncedHandleResize);
    window.addEventListener("eventExpand", debouncedHandleResize);

    return () => {
      window.removeEventListener("resize", debouncedHandleResize);
      window.removeEventListener("eventCollapse", debouncedHandleResize);
      window.removeEventListener("eventExpand", debouncedHandleResize);
    };
  });

  useEffect(() => {
    setDimensions({
      width: containerRef?.current?.clientWidth || 0,
      height: containerRef?.current?.clientHeight || 0,
    });
  }, [data?.length, model, plots?.length]);

  const isHorizontal = layout.includes("horizontal") || layout?.length === 0;
  const isVertical = layout.includes("vertical") || layout?.length === 0;

  const getXlLayout = () => {
    if (isVertical && !isHorizontal) {
      return 12;
    }

    if (plots?.length === 1) return 12;
    if (plots?.length === 2) return 6;

    return screen.width > 2500 ? 4 : 6;
  };

  const tableLayout = getXlLayout();

  return (
    <Box
      sx={{ display: "flex", minHeight: "60vh", height: "calc(80vh - 24px)" }}
      ref={containerRef}
    >
      <SimulationsSidePanel
        portalId="simulations-portal"
        addPlotOptions={addPlotOptions}
        handleAddPlot={handleAddPlot}
        model={model}
        isSharedWithMe={isSharedWithMe}
        layoutOptions={layoutOptions}
        layout={layout}
        setLayout={setLayout}
        plots={plots}
        control={control}
        units={units}
        simulation={simulation}
        groups={groups}
        visibleGroups={visibleGroups}
        handleVisibleGroups={handleVisibleGroups}
        addSliderOptions={addSliderOptions}
        handleAddSlider={handleAddSlider}
        orderedSliders={orderedSliders}
        getSliderValue={getSliderValue}
        getSliderBounds={getSliderBounds}
        handleChangeSlider={handleChangeSlider}
        handleWidenSlider={widenSliderRange}
        handleNarrowSlider={narrowSliderRange}
        handleRemoveSlider={handleRemoveSlider}
        handleSaveAllSlider={handleSaveAllSlider}
        handleOptimise={handleOptimise}
        handleOptimiseWithInputs={handleOptimiseWithInputs}
        loadingOptimise={loadingOptimise}
        optimiseResult={optimiseResult}
        exportSimulation={exportSimulation}
        showReference={showReference}
        setShowReference={setShowReference}
        shouldShowLegend={shouldShowLegend}
        setShouldShowLegend={setShouldShowLegend}
        variables={variables}
      />
      <Box
        sx={{
          maxHeight: "80vh",
          maxWidth: "100%",
          overflow: "auto",
        }}
      >
        <Grid
          container
          columns={{ xl: 12, md: 12, sm: 12 }}
          direction="row"
          wrap={isHorizontal && !isVertical ? "nowrap" : "wrap"}
        >
          {plots.length === 0 && (
            <Grid>
              <Typography variant="h6" component="h6">
                No plots available. Please add a plot by using the button in the
                Simulations side panel.
              </Typography>
            </Grid>
          )}
          {plots.map((plot, index) => (
            <Grid
              key={index}
              size={{
                xl: tableLayout,
                md: tableLayout,
                sm: tableLayout,
              }}
            >
              {data?.length && model ? (
                <SimulationPlotView
                  index={index}
                  plot={plot}
                  data={data}
                  dataReference={showReference ? dataReference : []}
                  variables={
                    variables?.map((variable) =>
                      renameVariable(variable, model),
                    ) || []
                  }
                  control={control}
                  setValue={setValue}
                  remove={removePlot}
                  units={units}
                  compound={compound}
                  model={model}
                  visibleGroups={visibleGroups}
                  shouldShowLegend={shouldShowLegend}
                  isVertical={isVertical}
                  isHorizontal={isHorizontal}
                  dimensions={dimensions}
                  plotCount={plots?.length}
                />
              ) : (
                <div>Loading...</div>
              )}
            </Grid>
          ))}
          <Snackbar open={Boolean(simulateError)} autoHideDuration={6000}>
            <Alert severity="error">
              Error simulating model: {simulateError?.error || "unknown error"}
            </Alert>
          </Snackbar>
          <Snackbar open={Boolean(exportSimulateError)} autoHideDuration={6000}>
            <Alert severity="error">
              Error exporting model:{" "}
              {exportSimulateError?.error || "unknown error"}
            </Alert>
          </Snackbar>
          <Snackbar
            open={Boolean(optimiseError)}
            autoHideDuration={6000}
            onClose={() => setOptimiseError(null)}
          >
            <Alert severity="error" onClose={() => setOptimiseError(null)}>
              Error optimising model: {optimiseError?.error || "unknown error"}
            </Alert>
          </Snackbar>
          <Snackbar
            open={optimiseResultOpen}
            autoHideDuration={6000}
            onClose={() => setOptimiseResultOpen(false)}
          >
            <Alert
              severity="success"
              onClose={() => setOptimiseResultOpen(false)}
            >
              Optimisation complete. Loss: {optimiseResult?.loss.toFixed(4)}. {" "}
              {optimiseResult?.reason}
            </Alert>
          </Snackbar>
        </Grid>
      </Box>
    </Box>
  );
};

const Simulations: FC = () => {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const { groups, isLoading: isGroupsLoading } = useSubjectGroups();
  const projectIdOrZero = projectId || 0;
  const { data: project, isLoading: isProjectLoading } =
    useProjectRetrieveQuery({ id: projectIdOrZero }, { skip: !projectId });
  const { data: models, isLoading: isModelsLoading } =
    useCombinedModelListQuery(
      { projectId: projectIdOrZero },
      { skip: !projectId },
    );
  const model = useMemo(() => {
    return models?.[0] || undefined;
  }, [models]);
  const { data: variables } = useVariableListQuery(
    { dosedPkModelId: model?.id || 0 },
    { skip: !model?.id },
  );
  const { data: simulations, isLoading: isSimulationsLoading } =
    useSimulationListQuery(
      { projectId: projectIdOrZero },
      { skip: !projectId },
    );
  const simulation = useMemo(() => {
    return simulations?.[0] || undefined;
  }, [simulations]);
  const { data: units, isLoading: isUnitsLoading } = useUnitListQuery(
    { compoundId: project?.compound || 0 },
    { skip: !project?.compound },
  );
  const { data: compound, isLoading: isLoadingCompound } =
    useCompoundRetrieveQuery(
      { id: project?.compound || 0 },
      { skip: !project?.compound },
    );

  const loading = [
    isGroupsLoading,
    isProjectLoading,
    isSimulationsLoading,
    isModelsLoading,
    isUnitsLoading,
    isLoadingCompound,
  ].some((v) => v);
  if (loading) {
    return <div>Loading...</div>;
  }

  if (!project || !model || !variables || !simulation || !units || !compound) {
    return <div>Not found</div>;
  }
  return (
    <SimulationsTab
      groups={groups}
      project={project}
      compound={compound}
      model={model}
      variables={variables}
      simulation={simulation}
      units={units}
    />
  );
};

export default Simulations;
