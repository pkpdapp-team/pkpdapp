import { Alert, Button, Container, Grid, Snackbar, Stack, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import { Simulate, SimulateResponse, Simulation, SimulationPlotRead, SimulationRead, SimulationSlider, SimulationSliderRead, UnitRead, VariableRead, useCombinedModelListQuery, useCombinedModelSimulateCreateMutation, useCompoundRetrieveQuery, useProjectRetrieveQuery, useProtocolListQuery, useSimulationListQuery, useSimulationUpdateMutation, useUnitListQuery, useVariableListQuery, useVariableUpdateMutation } from '../../app/backendApi';
import { useFieldArray, useForm } from 'react-hook-form';
import { useEffect, useMemo, useState } from 'react';
import SimulationPlotView from './SimulationPlotView';
import SimulationSliderView from './SimulationSliderView';
import DropdownButton from '../../components/DropdownButton';
import { Add, NorthWestSharp } from '@mui/icons-material';
import FloatField from '../../components/FloatField';
import useDirty from '../../hooks/useDirty';
import UnitField from '../../components/UnitField';
import paramPriority from '../model/paramPriority';

type SliderValues = {[key: number]: number};

interface ErrorObject {
  error: string;
};

const getSimulateInput = (simulation: Simulation, sliderValues: SliderValues, variables?: VariableRead[], timeMax?: number, allOutputs: boolean = false ): Simulate => {
    let outputs: string[] = [];
    let simulateVariables: {[key: string]: number} = {};
    for (const slider of simulation?.sliders || []) {
      if (sliderValues[slider.variable]) {
        const variable = variables?.find((v) => v.id === slider.variable);
        if (variable) {
          simulateVariables[variable.qname] = sliderValues[slider.variable];
        }
      }
    }
    if (allOutputs) {
      for (const v of variables || []) {
        if (!v.constant) {
          outputs.push(v.qname);
        }
      }
    } else {
      for (const plot of simulation?.plots || []) {
        for (const y_axis of plot.y_axes) {
          const variable = variables?.find((v) => v.id === y_axis.variable);
          if (variable && !outputs.includes(variable.name)) {
            outputs.push(variable.qname);
          }
        }
      }
    }
    // add time as an output
    const timeVariable = variables?.find((v) => v.name === 'time' || v.name === 't');
    outputs.push(timeVariable?.qname || 'time');
    return {
      variables: simulateVariables, outputs, time_max: timeMax || undefined,
    }
}

const getSliderInitialValues = (simulation?: SimulationRead, existingSliderValues?: SliderValues, variables?: VariableRead[]): SliderValues => {
  let initialValues: {[key: number]: number} = {};
  for (const slider of simulation?.sliders || []) {
    if (existingSliderValues && existingSliderValues[slider.variable]) {
      initialValues[slider.variable] = existingSliderValues[slider.variable];
    } else {
      const variable = variables?.find((v) => v.id === slider.variable);
      if (variable) {
        initialValues[slider.variable] = variable.default_value || 1.0;
      } else {
        initialValues[slider.variable] = 1.0;
      }
    }
  }
  return initialValues;
}


const Simulations: React.FC = () => {
  const projectId = useSelector((state: RootState) => state.main.selectedProject);
  const { data: project, isLoading: isProjectLoading } = useProjectRetrieveQuery({id: projectId || 0}, { skip: !projectId })
  const { data: models, isLoading: isModelsLoading } = useCombinedModelListQuery({projectId: projectId || 0}, { skip: !projectId})
  const { data: protocols, error: protocolsError, isLoading: isProtocolsLoading } = useProtocolListQuery({projectId: projectId || 0}, { skip: !projectId})
  const model = useMemo(() => {
    return models?.[0] || undefined
  }, [models]);
  const { data: variables, isLoading: isVariablesLoading } = useVariableListQuery({ dosedPkModelId: model?.id || 0 }, { skip: !model?.id })
  const { data: simulations, isLoading: isSimulationsLoading } = useSimulationListQuery({projectId: projectId || 0}, { skip: !projectId })
  const simulation = useMemo(() => {
    return simulations?.[0] || undefined
  }, [simulations]);
  const [updateSimulation] = useSimulationUpdateMutation();
  const { data: units, isLoading: isUnitsLoading } = useUnitListQuery({ compoundId: project?.compound || 0 }, { skip: !project?.compound });
  const [ simulate, { error: simulateErrorBase } ] = useCombinedModelSimulateCreateMutation();
  const simulateError: ErrorObject | undefined = simulateErrorBase  ? ('data' in simulateErrorBase ? simulateErrorBase.data as ErrorObject : { error: 'Unknown error' }) : undefined;
  const [ data, setData ] = useState<SimulateResponse | null>(null);
  const { data: compound, isLoading: isLoadingCompound } = useCompoundRetrieveQuery({id: project?.compound || 0 }, { skip: !project?.compound})
  const [updateVariable] = useVariableUpdateMutation();


  const [ sliderValues, setSliderValues ] = useState<{[key: number]: number} | undefined>(undefined);
  const [ loadingSimulate, setLoadingSimulate] = useState<boolean>(false);

  const defaultSimulation: SimulationRead = {
    id: 0,
    name: 'default',
    sliders: [],
    plots: [],
    nrows: 0,
    ncols: 0,
    project: projectId || 0,
    time_max_unit: model?.time_unit || 0,
  };

  const { reset, handleSubmit, control, formState: { isDirty }, setValue } = useForm<Simulation>({
    defaultValues: simulation || defaultSimulation,
  });
  useDirty(isDirty || loadingSimulate);


  const { fields: sliders, append: addSimulationSlider, remove: removeSlider } = useFieldArray({
    control,
    name: "sliders",
  });

  const { fields: plots, append: addSimulationPlot, remove: removePlot } = useFieldArray({
    control,
    name: "plots",
  });

  // reset form and sliders if simulation changes
  useEffect(() => {
    if (simulation && variables) {
      setSliderValues(s => getSliderInitialValues(simulation, s, variables));
      //setLoadingSimulate(true);
      reset(simulation);
    }
  }, [simulation, reset, variables]);
  
  const getTimeMax = (simulation: SimulationRead, variables: VariableRead[]): number => {
    const timeMaxUnit = units?.find((u) => u.id === simulation.time_max_unit);
    const compatibleTimeUnit = timeMaxUnit?.compatible_units?.find((u) => parseInt(u.id) === model?.time_unit); 
    const timeMaxConversionFactor = compatibleTimeUnit ? parseFloat(compatibleTimeUnit.conversion_factor) : 1.0;
    const timeMax = (simulation?.time_max || 0) * timeMaxConversionFactor;
    return timeMax;
  }

  // generate a simulation if slider values change
  useEffect(() => {
    if (simulation?.id && sliderValues && variables && model && protocols && compound) {
      const timeMax = getTimeMax(simulation, variables);
      simulate({ id: model.id, simulate: getSimulateInput(simulation, sliderValues, variables, timeMax)})
      .then((response) => {
        setLoadingSimulate(false);
        if ("data" in response) {
          const data = response.data as SimulateResponse;
          setData(data);
        }
      });
    }
  }, [simulation, simulate, sliderValues, model, protocols, variables, compound]);
  
  const exportSimulation = () => {
    if (simulation && variables && model && protocols && compound && sliderValues && project) {
      const timeMax = getTimeMax(simulation, variables);
      simulate({ id: model.id, simulate: getSimulateInput(simulation, sliderValues, variables, timeMax, true)})
      .then((response) => {
        if ("data" in response) {
          const data = response.data as SimulateResponse;
          const nrows = data.outputs[Object.keys(data.outputs)[0]].length;
          const cols = Object.keys(data.outputs)
          const vars = cols.map((vid) => variables.find((v) => v.id === parseInt(vid)));
          const varNames = vars.map((v) => v?.qname || '');
          const ncols = cols.length;
          let rows = new Array(nrows + 1);
          rows[0] = varNames;
          for (let i = 0; i < nrows; i++) {
            rows[i + 1] = new Array(ncols);
            for (let j = 0; j < ncols; j++) {
              rows[i + 1][j] = data.outputs[cols[j]][i];
            }
          }
          const csvContent = rows.map(e => e.join(",")).join("\n");
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `${project.name}.csv`;
          link.href = url;
          link.click();
        }
      });
    }
  }

  
  // save simulation every second if dirty
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isDirty && simulation) {
        handleSubmit((data) => {
          // empty string keeps getting in, so convert to null
          for (let i = 0; i < data.plots.length; i++) {
            // @ts-ignore
            if (data.plots[i].min === '') { 
              data.plots[i].min = null;
            }
            // @ts-ignore
            if (data.plots[i].max === '') {
              data.plots[i].max = null;
            }
            // @ts-ignore
            if (data.plots[i].min2 === '') {
              data.plots[i].min2 = null;
            }
            // @ts-ignore
            if (data.plots[i].max2 === '') {
              data.plots[i].max2 = null;
            }
          }
          updateSimulation({ id: simulation.id, simulation: data });
        })();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [handleSubmit, isDirty, updateSimulation]);
  

  if (isProjectLoading || isSimulationsLoading || isModelsLoading || isLoadingCompound || isUnitsLoading) {
    return <div>Loading...</div>;
  }

  if (!simulation || !project || !models || !variables || !units || !compound) {
    return <div>Not found</div>;
  }
  
  
  let orderedSliders = sliders.map((slider) => {
    const variable = variables.find((v) => v.id === slider.variable);
    return { ...slider, priority: variable ? paramPriority(variable) : 0 };
  });
  orderedSliders.sort((a, b) => a.priority - b.priority);

  
  const filterOutputs = model?.is_library_model ? ['environment.t', 'PDCompartment.C_Drug'] : [];
  const outputs = variables?.filter((variable) => !variable.constant && !filterOutputs.includes(variable.qname)) || [];
  let outputsSorted = outputs.map((variable) => { 
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
  let inputs = variables?.filter((variable) => variable.constant) || [];
  inputs.sort((a, b) => { return paramPriority(a) - paramPriority(b) });
  const addPlotOptions = outputsSorted.map((variable) => ({ value: variable.id, label: variable.description ? `${variable.name} (${variable.description})` : variable.name }));
  const sliderVarIds = sliders.map(v => v.variable)
  const addSliderOptions = inputs.filter(v => !sliderVarIds.includes(v.id)).map((variable) => ({ value: variable.id, label: `${variable.name} (${variable.description})` }));

  const handleAddPlot = (variableId: number) => {
    const variable = variables?.find((v) => v.id === variableId);
    if (!variable) {
      return;
    }
    const defaultXUnit = units?.find((unit: UnitRead) => unit.symbol === 'h')?.id || 0
    const defaultPlot: SimulationPlotRead = {
      id: 0,
      y_axes: [
        {
          id: 0,
          variable: variable.id,
        }
      ],
      cx_lines: [],
      index: 0,
      x_unit: defaultXUnit,
      y_unit: variable.unit,
      y_unit2: null,
    }
    addSimulationPlot(defaultPlot);
  }

  const handleAddSlider = (variableId: number) => {
    const defaultSlider: SimulationSliderRead = {
      id: 0,
      variable: variableId,
    }
    addSimulationSlider(defaultSlider);
  }

  const handleChangeSlider = (slider: SimulationSlider) => (value: number) => {
    setSliderValues({ ...sliderValues, [slider.variable]: value });
    setLoadingSimulate(true);
  }

  const handleSaveSlider = (slider: SimulationSlider) => (value: number) => {
    const variable = variables?.find((v) => v.id === slider.variable);
    if (!variable) {
      return;
    }
    updateVariable({ id: slider.variable, variable: { ...variable, default_value: value }});
  }

  return (
    <Container maxWidth={false}>
      <Stack spacing={1}>
      <Stack direction={'row'} alignItems={'center'}>
        <Typography variant="h6">Plots</Typography>
        
        <DropdownButton options={addPlotOptions} onOptionSelected={handleAddPlot} data_cy="add-plot">
          <Add />
        </DropdownButton>
      </Stack>
      <Grid container spacing={1}>
        {plots.map((plot, index) => (
          <Grid item md={12} lg={6} key={index}>
            {data && model ? 
              <SimulationPlotView index={index} plot={plot} data={data} variables={variables || []} control={control} setValue={setValue} remove={removePlot} units={units} compound={compound} model={model}/>
              :
              <div>Loading...</div>
            }
          </Grid>
        ))}
      </Grid>
      <Snackbar open={Boolean(simulateError)} autoHideDuration={6000} >
        <Alert severity="error">
          Error simulating model: {simulateError?.error || 'unknown error'}
        </Alert>
      </Snackbar>
      { plots.length > 0 && (
        <>
        <Stack direction={'row'} alignItems={'center'} spacing={2} justifyContent="flex-start">
          <FloatField label="Simulation Duration" name="time_max" control={control} />
          <UnitField label="Unit" name="time_max_unit" baseUnit={units.find(u => u.id === simulation?.time_max_unit)} control={control} selectProps={{ style: { flexShrink: 0 }}} />
          <Button variant="contained" onClick={exportSimulation}>Export to CSV</Button>
        </Stack>
        <Stack direction={'row'} alignItems={'center'}>
          <Typography variant="h6">Parameters</Typography>
          <DropdownButton options={addSliderOptions} onOptionSelected={handleAddSlider}  data_cy="add-parameter-slider">
            <Add />
          </DropdownButton>
        </Stack>
        <Grid container spacing={2}>
          {orderedSliders.map((slider, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <SimulationSliderView index={index} slider={slider} onChange={handleChangeSlider(slider)} remove={removeSlider} onSave={handleSaveSlider(slider)} units={units} />
            </Grid>
          ))}
        </Grid>
        </>
      )}
      </Stack>
    </Container>
  );
}

export default Simulations;
