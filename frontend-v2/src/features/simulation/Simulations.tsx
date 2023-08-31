import { Alert, Container, Grid, Snackbar, Stack, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import { Simulate, SimulateResponse, Simulation, SimulationPlot, SimulationSlider, Unit, Variable, useCombinedModelListQuery, useCombinedModelSimulateCreateMutation, useCompoundRetrieveQuery, useProjectRetrieveQuery, useProtocolListQuery, useSimulationListQuery, useSimulationUpdateMutation, useUnitListQuery, useVariableListQuery, useVariableUpdateMutation } from '../../app/backendApi';
import { useFieldArray, useForm } from 'react-hook-form';
import { useEffect, useMemo, useState } from 'react';
import SimulationPlotView from './SimulationPlotView';
import SimulationSliderView from './SimulationSliderView';
import DropdownButton from '../../components/DropdownButton';
import { Add } from '@mui/icons-material';
import FloatField from '../../components/FloatField';
import useDirty from '../../hooks/useDirty';
import { SerializedError } from '@reduxjs/toolkit';
import UnitField from '../../components/UnitField';

type SliderValues = {[key: number]: number};

interface ErrorObject {
  error: string;
};

const getSimulateInput = (simulation: Simulation, sliderValues: SliderValues, variables?: Variable[], timeMax?: number ): Simulate => {
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
    for (const plot of simulation?.plots || []) {
      for (const y_axis of plot.y_axes) {
        const variable = variables?.find((v) => v.id === y_axis.variable);
        if (variable && !outputs.includes(variable.name)) {
          outputs.push(variable.qname);
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

const getSliderInitialValues = (simulation?: Simulation, existingSliderValues?: SliderValues, variables?: Variable[]): SliderValues => {
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

  const defaultSimulation: Simulation = {
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

  // generate a simulation if slider values change
  useEffect(() => {
    if (simulation?.id && sliderValues && variables && model && protocols) {
      const timeMaxUnit = units?.find((u) => u.id === simulation.time_max_unit);
      const compatibleTimeUnit = timeMaxUnit?.compatible_units?.find((u) => parseInt(u.id) === model.time_unit); 
      const timeMaxConversionFactor = compatibleTimeUnit ? parseFloat(compatibleTimeUnit.conversion_factor) : 1.0;
      const timeMax = (simulation?.time_max || 0) * timeMaxConversionFactor;
      simulate({ id: model.id, simulate: getSimulateInput(simulation, sliderValues, variables, timeMax)})
      .then((response) => {
        setLoadingSimulate(false);
        if ("data" in response) {
          const data = response.data as SimulateResponse;
          setData(data);
        }
      });
    }
  }, [simulation, simulate, sliderValues, model, protocols, variables]);

  
  // save simulation every second if dirty
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isDirty) {
        handleSubmit((data) => updateSimulation({ id: data.id, simulation: data }))();
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
  
  const outputs = variables?.filter((variable) => !variable.constant) || [];
  const inputs = variables?.filter((variable) => variable.constant) || [];
  const addPlotOptions = outputs.map((variable) => ({ value: variable.id, label: variable.name }));
  const sliderVarIds = sliders.map(v => v.variable)
  const addSliderOptions = inputs.filter(v => !sliderVarIds.includes(v.id)).map((variable) => ({ value: variable.id, label: variable.name }));

  const handleAddPlot = (variableId: number) => {
    const variable = variables?.find((v) => v.id === variableId);
    if (!variable) {
      return;
    }
    const defaultXUnit = units?.find((unit: Unit) => unit.symbol === 'h')?.id || 0
    const defaultPlot: SimulationPlot = {
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
    const defaultSlider: SimulationSlider = {
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
            {data ? 
              <SimulationPlotView index={index} plot={plot} data={data} variables={variables || []} control={control} setValue={setValue} remove={removePlot} units={units} compound={compound}/>
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
        </Stack>
        <Stack direction={'row'} alignItems={'center'}>
          <Typography variant="h6">Parameters</Typography>
          <DropdownButton options={addSliderOptions} onOptionSelected={handleAddSlider}  data_cy="add-parameter-slider">
            <Add />
          </DropdownButton>
        </Stack>
        <Grid container spacing={2}>
          {sliders.map((slider, index) => (
            <Grid item xs={12} md={6} lg={3} key={index}>
              <SimulationSliderView index={index} slider={slider} onChange={handleChangeSlider(slider)} remove={removeSlider} onSave={handleSaveSlider(slider)} />
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
