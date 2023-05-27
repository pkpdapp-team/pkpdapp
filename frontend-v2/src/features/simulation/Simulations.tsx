import { Button, Grid, IconButton, List, ListItem, ListItemSecondaryAction, MenuItem, Select, Stack, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import { Simulate, SimulateResponse, Simulation, Unit, Variable, useCombinedModelSimulateCreateMutation, useProjectRetrieveQuery, useSimulationListQuery, useSimulationUpdateMutation, useUnitListQuery, useVariableListQuery } from '../../app/backendApi';
import { useFieldArray, useForm, useFormState } from 'react-hook-form';
import { useEffect, useMemo, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import SimulationPlot from './SimulationPlot';
import SimulationSlider from './SimulationSlider';
import { get } from 'http';

type SliderValues = {[key: number]: number};

const getSimulateInput = (simulation: Simulation, sliderValues: SliderValues, variables?: Variable[] ): Simulate => {
    let outputs: string[] = [];
    let simulateVariables: {[key: string]: number} = {};
    let initial_conditions: {[key: string]: number} = {};
    for (const slider of simulation?.sliders || []) {
      if (sliderValues[slider.variable]) {
        simulateVariables[slider.variable] = sliderValues[slider.variable];
      }
    }
    for (const plot of simulation?.plots || []) {
      for (const y_axis of plot.y_axes) {
        const variable = variables?.find((v) => v.id === y_axis.variable);
        if (variable && !outputs.includes(variable.name)) {
          outputs.push(variable.name);
        }
      }
    }
    return {
      variables: simulateVariables, outputs, initial_conditions
    }
}


const Simulations: React.FC = () => {
  const projectId = useSelector((state: RootState) => state.main.selectedProject);
  const { data: project, error: projectError, isLoading: isProjectLoading } = useProjectRetrieveQuery({id: projectId || 0})
  const { data: variables, error: variablesError, isLoading: isVariablesLoading } = useVariableListQuery({projectId: projectId || 0})
  const { data: simulations, error: simulationsError, isLoading: isSimulationsLoading } = useSimulationListQuery({projectId: projectId || 0})
  const simulation = simulations?.[0] || null;
  const [updateSimulation, { isLoading: isSimulationUpdating }] = useSimulationUpdateMutation();
  const { data: units, error: unitsError, isLoading: unitsLoading } = useUnitListQuery()
  const [ simulate, { isLoading: isSimulating }] = useCombinedModelSimulateCreateMutation();
  const [ data, setData ] = useState<SimulateResponse | null>(null);

  const getSliderInitialValues = (existingSliderValues?: SliderValues): SliderValues => {
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

  const [ sliderValues, setSliderValues ] = useState<{[key: number]: number}>(getSliderInitialValues());

  const defaultSimulation: Simulation = {
    id: 0,
    name: 'default',
    sliders: [],
    plots: [],
    nrows: 0,
    ncols: 0,
    project: projectId || 0,
  };

  const { reset, watch, handleSubmit, control, formState: { isDirty, defaultValues } } = useForm<Simulation>({
    defaultValues: simulation || defaultSimulation,
  });

  const { fields: sliders, append: addSimulationSlider, remove: removeSimulationSlider } = useFieldArray({
    control,
    name: "sliders",
  });

  const { fields: plots, append: addSimulationPlot, remove: removeSimulationPlot } = useFieldArray({
    control,
    name: "plots",
  });

  // reset form and sliders if simulation changes
  useEffect(() => {
    console.log('resetting simulation')
    if (simulation) {
      setSliderValues(getSliderInitialValues(sliderValues));
      reset(simulation);
    }
  }, [simulation, reset]);

  // generate a simulation if slider values change
  const simulateInput = useMemo(() => {
    return simulation && variables && sliderValues ? getSimulateInput(simulation, sliderValues, variables) : null;
  }, [sliderValues, simulation, variables]);

  useEffect(() => {
    if (simulation && simulateInput) {
      console.log('simulate')
      simulate({ id: simulation.id, simulate: simulateInput })
      .then((response) => {
        if ("data" in response) {
          const data = response.data as SimulateResponse;
          console.log('simulate response', data);
          setData(data);
        }
      });
    }
  }, [simulation, simulate, simulateInput]);

  
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
  

  if (isProjectLoading || isSimulationsLoading) {
    return <div>Loading...</div>;
  }

  if (!simulation || !project) {
    return <div>Not found</div>;
  }

  
  const outputs = variables?.filter((variable) => !variable.constant) || [];
  const inputs = variables?.filter((variable) => variable.constant) || [];
  const addPlotOptions = outputs.map((variable) => ({ value: variable.id, label: variable.name }));
  const addSliderOptions = inputs.map((variable) => ({ value: variable.id, label: variable.name }));

  const handleAddPlot = (variableId: number) => {
    const defaultXUnit = units?.find((unit: Unit) => unit.symbol === 'h')?.id || 0
    const defaultPlot: SimulationPlot = {
      id: 0,
      simulation: simulation?.id || 0,
      y_axes: [
        {
          id: 0,
          variable: variableId,
          plot: 0,
        }
      ],
      cx_lines: [],
      index: 0,
      receptor_occupancy: false,
      x_unit: defaultXUnit,
      y_unit: null,
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
    <>
      <Grid container spacing={2}>
        {simulation.plots.map((plot, index) => (
          <Grid item xs={12} md={6} key={index}>
            {data ? 
              <SimulationPlot plot={plot} data={data} variables={variables || []} />
              :
              <div>Loading...</div>
            }
          </Grid>
        ))}
        <Select onChange={(e) => handleAddPlot(e.target.value as number)}>
          {addPlotOptions.map((option, index) => (
            <MenuItem key={index} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </Grid>
      <Grid container spacing={2}>
        {simulation.sliders.map((slider, index) => (
          <Grid item xs={12} md={6} lg={3} key={index}>
            <SimulationSlider slider={slider} onChange={handleChangeSlider(slider)} />
          </Grid>
        ))}
        <Select onChange={(e) => handleAddSlider(e.target.value as number)}>
          {addSliderOptions.map((option, index) => (
            <MenuItem key={index} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </Grid>
    </>
  );
}

export default Simulations;
