import {
  Alert,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Grid,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  Simulation,
  SimulationPlotRead,
  SimulationRead,
  SimulationSlider,
  SimulationSliderRead,
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
import { FC, useCallback, useEffect, useMemo, useState, useRef } from "react";
import SimulationPlotView from "./SimulationPlotView";
import SimulationSliderView from "./SimulationSliderView";
import useSimulation from "./useSimulation";
import useSimulationInputs from "./useSimulationInputs";
import useSimulatedVariables from "./useSimulatedVariables";
import DropdownButton from "../../components/DropdownButton";
import SettingsIcon from "@mui/icons-material/Settings";
import FloatField from "../../components/FloatField";
import useDirty from "../../hooks/useDirty";
import UnitField from "../../components/UnitField";
import paramPriority from "../model/paramPriority";
import HelpButton from "../../components/HelpButton";
import { selectIsProjectShared } from "../login/loginSlice";
import { getConstVariables } from "../model/resetToSpeciesDefaults";
import useDataset from "../../hooks/useDataset";
import useExportSimulation from "./useExportSimulation";

type SliderValues = { [key: number]: number };

interface ErrorObject {
  error: string;
}


const getSliderInitialValues = (
  simulation?: SimulationRead,
  existingSliderValues?: SliderValues,
  variables?: VariableRead[],
): SliderValues => {
  const initialValues: SliderValues = {};
  for (const slider of simulation?.sliders || []) {
    if (existingSliderValues && existingSliderValues[slider.variable]) {
      initialValues[slider.variable] = existingSliderValues[slider.variable];
    } else {
      const variable = variables?.find((v) => v.id === slider.variable);
      if (variable?.default_value) {
        initialValues[slider.variable] = variable.default_value;
      }
    }
  }
  return initialValues;
};

const Simulations: FC = () => {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const { groups } = useDataset(projectId);
  const [visibleGroups, setVisibleGroups] =
    useState<string[]>(['Project', ...groups.map(group => group.name)]);
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
  const [updateSimulation] = useSimulationUpdateMutation();
  const { data: units, isLoading: isUnitsLoading } = useUnitListQuery(
    { compoundId: project?.compound || 0 },
    { skip: !project?.compound },
  );
  const { data: compound, isLoading: isLoadingCompound } =
    useCompoundRetrieveQuery(
      { id: project?.compound || 0 },
      { skip: !project?.compound },
    );
  const [updateVariable] = useVariableUpdateMutation();

  const [sliderValues, setSliderValues] = useState<
    SliderValues | undefined
  >(undefined);
  const handleChangeSlider = useCallback((variable: number, value: number) => {
    setSliderValues(prevSliderValues => ({ ...prevSliderValues, [variable]: value }));
  }, []);

  const isSharedWithMe = useSelector((state: RootState) => selectIsProjectShared(state, project));

  const defaultSimulation: SimulationRead = {
    id: 0,
    name: "default",
    sliders: [],
    plots: [],
    nrows: 0,
    ncols: 0,
    project: projectIdOrZero,
    time_max_unit: model?.time_unit || 0,
  };

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

  const simInputs = useSimulationInputs(simulation, sliderValues, variables, timeMax);
  const simulatedVariables = useSimulatedVariables(variables, sliderValues);
  const { loadingSimulate, data } = useSimulation(
    simInputs,
    simulatedVariables,
    model
  );

  const {
    reset,
    handleSubmit,
    control,
    formState: { isDirty },
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
  const defaultLayout = layoutOptions[0]?.value;
  const [layout, setLayout] = useState<string>(defaultLayout);
  const parametersRef = useRef<HTMLDivElement | null>(null);
  const [parametersHeight, setParametersHeight] = useState<number>(0);

  useEffect(() => {
    const height = parametersRef?.current?.clientHeight || 0;
    setParametersHeight(height);
  }, [parametersRef?.current?.clientHeight])

  const updateWindowDimensions = () => window.innerWidth < 1000 && setLayout('horizontal');
  window.addEventListener("resize", updateWindowDimensions);

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

  const [exportSimulation, { error: simulateErrorBase }] = useExportSimulation({
    simInputs,
    simulatedVariables,
    model,
    project
  });
  const simulateError: ErrorObject | undefined = simulateErrorBase
    ? "data" in simulateErrorBase
      ? (simulateErrorBase.data as ErrorObject)
      : { error: "Unknown error" }
    : undefined;

  // save simulation every second if dirty
  useEffect(() => {
    const onSubmit = (dta: Simulation) => {
      // empty string keeps getting in, so convert to null
      for (let i = 0; i < dta.plots.length; i++) {
        // @ts-ignore
        if (dta.plots[i].min === "") {
          dta.plots[i].min = null;
        }
        // @ts-ignore
        if (dta.plots[i].max === "") {
          dta.plots[i].max = null;
        }
        // @ts-ignore
        if (dta.plots[i].min2 === "") {
          dta.plots[i].min2 = null;
        }
        // @ts-ignore
        if (dta.plots[i].max2 === "") {
          dta.plots[i].max2 = null;
        }
      }
      updateSimulation({ id: simulation?.id || 0, simulation: dta });
    };

    const intervalId = setInterval(() => {
      if (!isDirty || !simulation) {
        return;
      }
      handleSubmit(onSubmit)();
    }, 1000);

    return () => clearInterval(intervalId);
  }, [handleSubmit, isDirty, simulation, updateSimulation]);

  const loading = [
    isProjectLoading,
    isSimulationsLoading,
    isModelsLoading,
    isLoadingCompound,
    isUnitsLoading,
  ].some((v) => v);
  if (loading) {
    return <div>Loading...</div>;
  }

  if (!simulation || !project || !models || !variables || !units || !compound) {
    return <div>Not found</div>;
  }

  const orderedSliders = sliders.map((slider, i) => {
    const variable = variables.find((v) => v.id === slider.variable);
    return { ...slider, priority: variable ? paramPriority(variable) : 0, fieldArrayIndex: i };
  });
  orderedSliders.sort((a, b) => a.priority - b.priority);

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

  let constVariables = model ? getConstVariables(variables, model) : [];
  const addPlotOptions = outputsSorted.map((variable) => ({
    value: variable.id,
    label: variable.description
      ? `${variable.name} (${variable.description})`
      : variable.name,
  }));
  const sliderVarIds = sliders.map((v) => v.variable);
  const addSliderOptions = constVariables
    .filter((v) => !sliderVarIds.includes(v.id))
    .map((variable) => ({
      value: variable.id,
      label: `${variable.name} (${variable.description})`,
    }));

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

  const handleAddSlider = (variableId: number) => {
    const defaultSlider: SimulationSliderRead = {
      id: 0,
      variable: variableId,
    };
    addSimulationSlider(defaultSlider);
  };
  
  const handleRemoveSlider = (index: number) => () => {
    removeSlider(index);
  }

  const handleSaveSlider = (slider: SimulationSlider) => (value: number) => {
    const variable = variables?.find((v) => v.id === slider.variable);
    if (!variable) {
      return;
    }
    updateVariable({
      id: slider.variable,
      variable: { ...variable, default_value: value },
    });
  };

  const handleVisibleGroups = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.checked) {
      const newState = visibleGroups.filter(name => name !== event.target.value);
      setVisibleGroups(newState);
      return;
    } else {
      const newState = new Set([...visibleGroups, event.target.value]);
      setVisibleGroups([...newState]);
    }
  }
  return (
    <Grid container sx={{ marginBottom: layout === 'vertical' ? 0 : `${parametersHeight}px` }}>
      <Grid item xl={layout === "vertical" ? 8 : 12} md={layout === "vertical" ? 7 : 12} xs={layout === "vertical" ? 6 : 12}>
        <Stack direction={"row"} alignItems={"center"}>
          <DropdownButton
            useIcon={false}
            data_cy="add-plot"
            options={addPlotOptions}
            onOptionSelected={handleAddPlot}
            disabled={isSharedWithMe}
          >
            Add new plot
          </DropdownButton>
        </Stack>
        {plots.length > 0 && (
          <>
            <Stack
              direction={"row"}
              alignItems={"center"}
              spacing={2}
              justifyContent="flex-start"
              paddingTop='1rem'
            >
              <FloatField
                label="Simulation Duration"
                name="time_max"
                control={control}
                textFieldProps={{ disabled: isSharedWithMe }}
              />
              <UnitField
                label="Unit"
                name="time_max_unit"
                baseUnit={units.find((u) => u.id === simulation?.time_max_unit)}
                control={control}
                selectProps={{ style: { flexShrink: 0 }, disabled: isSharedWithMe }}
              />
              <div>
                <Button variant="contained" onClick={exportSimulation}>
                  Export to CSV
                </Button>
                <HelpButton title={"Export to CSV"}>
                  A variables are reported in pmol, C or T variables are reported
                  in pmol/L and AUC variables are reported in pmol/L*h. These
                  units cannot be changed in the current version.
                </HelpButton>
              </div>
            </Stack>
          </>
        )}
        <Grid container spacing={1}>
          {plots.map((plot, index) => (
            <Grid item xl={layout === "vertical" ? 12 : 6} md={layout === "vertical" ? 12 : 6} xs={layout === "vertical" ? 12 : 12} key={index}>
              {data?.length && model ? (
                <SimulationPlotView
                  index={index}
                  plot={plot}
                  data={data}
                  variables={variables || []}
                  control={control}
                  setValue={setValue}
                  remove={removePlot}
                  units={units}
                  compound={compound}
                  model={model}
                  visibleGroups={visibleGroups}
                />
              ) : (
                <div>Loading...</div>
              )}
            </Grid>
          ))}
        </Grid>
        <Snackbar open={Boolean(simulateError)} autoHideDuration={6000}>
          <Alert severity="error">
            Error simulating model: {simulateError?.error || "unknown error"}
          </Alert>
        </Snackbar>
      </Grid>
      <Grid
        ref={parametersRef}
        item
        xl={layout === "vertical" ? 3 : 12}
        md={layout === "vertical" ? 4 : 12}
        xs={layout === "vertical" ? 5 : 12}
        sx={
          layout === "vertical"
            ? { position: "fixed", right: 0, paddingLeft: "1rem", width: '100%' }
            : { position: "fixed", bottom: 0, paddingBottom: '3rem', height: 'auto', backgroundColor: 'white', width: '-webkit-fill-available' }
        }
      >
        <Stack direction="column">
          {!!groups.length && (
            <>
              <Typography
                sx={{
                  fontWeight: "bold",
                  fontSize: "1.2rem",
                }}
              >
                Groups
              </Typography>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={visibleGroups.includes('Project')}
                      value='Project'
                      onChange={handleVisibleGroups}
                    />
                  }
                  label='Project'
                />
                {groups.map((group) => (
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
            </>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              paddingBottom: "1rem",
            }}
          >
            <Typography
              sx={{
                fontWeight: "bold",
                fontSize: "1.2rem",
              }}
            >
              Parameters
            </Typography>
            <DropdownButton
              useIcon={true}
              options={layoutOptions}
              onOptionSelected={(option) => {
                setLayout(option);
                window.dispatchEvent(new Event("resize"));
              }}
              data_cy="add-parameter-slider"
            >
              <SettingsIcon />
            </DropdownButton>
          </div>
          <DropdownButton
            useIcon={false}
            options={addSliderOptions}
            onOptionSelected={handleAddSlider}
            data_cy="add-parameter-slider"
            disabled={isSharedWithMe}
          >
            Add new
          </DropdownButton>
        </Stack>
        <Grid sx={{ paddingRight: "1rem" }} container spacing={2}>
          {orderedSliders.map((slider, index) => (
            <Grid
              item
              xs={layout === "horizontal" ? 12 : 12}
              md={layout === "horizontal" ? 6 : 12}
              xl={layout === "horizontal" ? 4 : 12}
              key={index}
            >
              <SimulationSliderView
                index={index}
                slider={slider}
                onChange={handleChangeSlider}
                onRemove={handleRemoveSlider(slider.fieldArrayIndex)}
                onSave={handleSaveSlider(slider)}
                units={units}
              />
            </Grid>
          ))}
        </Grid>
      </Grid>
    </Grid>
  );
};

export default Simulations;
