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

const EMPTY_MAP: SliderValues = new Map();

type SliderValues = Map<number, number>;

interface ErrorObject {
  error: string;
}

function getVariableName(
  variable: VariableRead,
  model?: CombinedModelRead,
): string {
  let variableName = variable.name;
  if (
    model?.number_of_effect_compartments &&
    model.number_of_effect_compartments > 1 &&
    variable.qname.startsWith("EffectCompartment")
  ) {
    const [compartment_name] = variable.qname.split(".");
    const compartment_number = compartment_name.replace(
      "EffectCompartment",
      "",
    );
    variableName = `${variable.name}${compartment_number}`;
  }
  return variableName;
}

export function renameVariable(
  variable: VariableRead,
  model?: CombinedModelRead,
): VariableRead {
  return {
    ...variable,
    name: getVariableName(variable, model),
  };
}

function addPlotVariableOption(variable: VariableRead) {
  return {
    value: variable.id,
    label: variable.description
      ? `${variable.name} (${variable.description})`
      : variable.name,
  };
}

const getSliderInitialValues = (
  simulation?: SimulationRead,
  existingSliderValues?: SliderValues,
  variables?: VariableRead[],
): SliderValues => {
  const initialValues: SliderValues = new Map();
  for (const slider of simulation?.sliders || []) {
    if (existingSliderValues && existingSliderValues.has(slider.variable)) {
      initialValues.set(
        slider.variable,
        existingSliderValues.get(slider.variable)!,
      );
    } else {
      const variable = variables?.find((v) => v.id === slider.variable);
      if (variable?.default_value) {
        initialValues.set(slider.variable, variable.default_value);
      }
    }
  }
  return initialValues;
};

interface UseSimulationDataProps {
  model?: CombinedModelRead;
  simulation?: SimulationRead;
  sliderValues?: SliderValues;
  variables?: VariableRead[];
  units?: UnitRead[];
  showReference?: boolean;
}

function useSimulationData({
  model,
  simulation,
  sliderValues,
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
    EMPTY_MAP,
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

  const [sliderValues, setSliderValues] = useState<SliderValues>(EMPTY_MAP);
  const handleChangeSlider = useCallback((variable: number, value: number) => {
    setSliderValues((prevSliderValues) => {
      const newSliderValues = new Map(prevSliderValues);
      newSliderValues.set(variable, value);
      return newSliderValues;
    });
  }, []);
  const [shouldShowLegend, setShouldShowLegend] = useState(true);
  const isSharedWithMe = useSelector((state: RootState) =>
    selectIsProjectShared(state, project),
  );

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
      sliderValues,
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
      setSliderValues((s) => {
        const initialValues = getSliderInitialValues(simulation, s, variables);
        return initialValues;
      });
      //setLoadingSimulate(true);
      reset(simulation);
    }
  }, [simulation, reset, variables]);

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

  const filterOutputs = model?.is_library_model
    ? ["environment.t", "PDCompartment.C_Drug"]
    : [];
  const outputs =
    variables?.filter(
      (variable) =>
        !variable.constant && !filterOutputs.includes(variable.qname),
    ) || [];
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
      y_unit: variable.unit,
      y_unit2: null,
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
  };

  const handleRemoveSlider = (index: number) => () => {
    removeSlider(index);
  };

  const handleSaveAllSlider = () => {
    for (const slider of sliders) {
      const variable = variables?.find((v) => v.id === slider.variable);
      if (!variable) {
        return;
      }
      const value = sliderValues?.get(slider.variable);
      if (value === undefined) {
        return;
      }
      updateVariable({
        id: slider.variable,
        variable: { ...variable, default_value: value },
      });
    }
  };

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
        handleChangeSlider={handleChangeSlider}
        handleRemoveSlider={handleRemoveSlider}
        handleSaveAllSlider={handleSaveAllSlider}
        exportSimulation={exportSimulation}
        showReference={showReference}
        setShowReference={setShowReference}
        shouldShowLegend={shouldShowLegend}
        setShouldShowLegend={setShouldShowLegend}
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
  console.log("Subject groups in Simulations:", groups);
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
