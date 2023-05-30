import { Button, Container, Grid, Stack, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import { Simulate, SimulateResponse, Simulation, SimulationPlot, SimulationSlider, Unit, Variable, useCombinedModelListQuery, useCombinedModelSimulateCreateMutation, useProjectRetrieveQuery, useSimulationListQuery, useSimulationUpdateMutation, useUnitListQuery, useVariableListQuery } from '../../app/backendApi';
import { useFieldArray, useForm } from 'react-hook-form';
import { useEffect, useMemo, useState } from 'react';
import SimulationPlotView from './SimulationPlotView';
import SimulationSliderView from './SimulationSliderView';
import DropdownButton from '../../components/DropdownButton';
import { Add } from '@mui/icons-material';

type SliderValues = {[key: number]: number};

const getSimulateInput = (simulation: Simulation, sliderValues: SliderValues, variables?: Variable[] ): Simulate => {
    let outputs: string[] = [];
    let simulateVariables: {[key: string]: number} = {};
    let initial_conditions: {[key: string]: number} = {};
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
    const timeVariable = variables?.find((v) => v.name === 'time');
    outputs.push(timeVariable?.qname || 'time');
    return {
      variables: simulateVariables, outputs, initial_conditions
    }
}

const getSliderInitialValues = (simulation?: Simulation, existingSliderValues?: SliderValues, variables?: Variable[]): SliderValues => {
  console.log('XXslider initial values')
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
  const { data: project, isLoading: isProjectLoading } = useProjectRetrieveQuery({id: projectId || 0})
  const { data: variables } = useVariableListQuery({projectId: projectId || 0})
  const { data: simulations, isLoading: isSimulationsLoading } = useSimulationListQuery({projectId: projectId || 0})
  const simulation = useMemo(() => {
    console.log('Xsimulation');
    return simulations?.[0] || undefined
  }, [simulations]);

  const { data: models, isLoading: isModelsLoading } = useCombinedModelListQuery({projectId: projectId || 0})
  const model = useMemo(() => {
    return models?.[0] || null;
  }, [models]);
  const [updateSimulation] = useSimulationUpdateMutation();
  const { data: units } = useUnitListQuery()
  const [ simulate ] = useCombinedModelSimulateCreateMutation();
  const [ data, setData ] = useState<SimulateResponse | null>(null);


  const [ sliderValues, setSliderValues ] = useState<{[key: number]: number} | undefined>(undefined);

  const defaultSimulation: Simulation = {
    id: 0,
    name: 'default',
    sliders: [],
    plots: [],
    nrows: 0,
    ncols: 0,
    project: projectId || 0,
  };

  const { reset, handleSubmit, control, formState: { isDirty }, setValue } = useForm<Simulation>({
    defaultValues: simulation || defaultSimulation,
  });

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
    console.log('resetting simulation')
    if (simulation) {
      setSliderValues(s => getSliderInitialValues(simulation, s, variables));
      reset(simulation);
    }
  }, [simulation, reset, variables]);

  // generate a simulation if slider values change
  useEffect(() => {
    if (simulation?.id && sliderValues && variables && model) {
      console.log('simulate', simulation.id, sliderValues, variables, model)
      simulate({ id: model.id, simulate: getSimulateInput(simulation, sliderValues, variables)})
      .then((response) => {
        if ("data" in response) {
          const data = response.data as SimulateResponse;
          console.log('simulate response', data);
          setData(data);
        }
      });
    }
  }, [simulation, simulate, sliderValues, variables, model]);

  
  // save simulation every second if dirty
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isDirty) {
        console.log('saving simulation')
        handleSubmit((data) => updateSimulation({ id: data.id, simulation: data }))();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [handleSubmit, isDirty, updateSimulation]);
  

  if (isProjectLoading || isSimulationsLoading || isModelsLoading) {
    return <div>Loading...</div>;
  }

  if (!simulation || !project || !models || !variables || !units) {
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
      simulation: simulation?.id || 0,
      y_axes: [
        {
          id: 0,
          variable: variable.id,
          plot: 0,
        }
      ],
      cx_lines: [],
      index: 0,
      receptor_occupancy: false,
      x_unit: defaultXUnit,
      y_unit: variable.unit,
      y_unit2: null,
    }
    addSimulationPlot(defaultPlot);
  }

  const handleAddSlider = (variableId: number) => {
    const defaultSlider: SimulationSlider = {
      id: 0,
      simulation: simulation?.id || 0,
      variable: variableId,
    }
    addSimulationSlider(defaultSlider);
  }

  const handleChangeSlider = (slider: SimulationSlider) => (value: number) => {
    setSliderValues({ ...sliderValues, [slider.variable]: value });
  }
    

  return (
    <Container maxWidth={false}>
      <Stack spacing={1}>
      <Stack direction={'row'} alignItems={'center'}>
        <Typography variant="h6">Plots</Typography>
        <DropdownButton options={addPlotOptions} onOptionSelected={handleAddPlot}>
          <Add />
        </DropdownButton>
      </Stack>
      <Grid container spacing={1}>
        {plots.map((plot, index) => (
          <Grid item md={12} lg={6} key={index}>
            {data ? 
              <SimulationPlotView index={index} plot={plot} data={data} variables={variables || []} control={control} setValue={setValue} remove={removePlot}/>
              :
              <div>Loading...</div>
            }
          </Grid>
        ))}
      </Grid>
      <Stack direction={'row'} alignItems={'center'}>
        <Typography variant="h6">Parameters</Typography>
        <DropdownButton options={addSliderOptions} onOptionSelected={handleAddSlider}>
          <Add />
        </DropdownButton>
      </Stack>
      <Grid container spacing={2}>
        {sliders.map((slider, index) => (
          <Grid item xs={12} md={6} lg={3} key={index}>
            <SimulationSliderView index={index} slider={slider} onChange={handleChangeSlider(slider)} remove={removeSlider} />
          </Grid>
        ))}
      </Grid>
      </Stack>
    </Container>
  );
}

export default Simulations;
