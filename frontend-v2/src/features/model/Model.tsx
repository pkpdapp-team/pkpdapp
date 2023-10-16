import { useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import { CombinedModel, CombinedModelRead, useCombinedModelListQuery, useCombinedModelUpdateMutation, useProjectRetrieveQuery, useProtocolDestroyMutation, useProtocolListQuery, useSimulationListQuery, useSimulationUpdateMutation, useVariableListQuery } from '../../app/backendApi';
import { useForm } from 'react-hook-form';
import { useEffect, useMemo } from 'react';
import { DynamicTabs, TabPanel } from '../../components/DynamicTabs';
import MapVariablesTab from './MapVariablesTab';
import PKPDModelTab from './PKPDModelTab';
import ParametersTab from './ParametersTab';
import useDirty from '../../hooks/useDirty';


const Model: React.FC = () => {
  const projectId = useSelector((state: RootState) => state.main.selectedProject);
  const { data: project, isLoading: isProjectLoading } = useProjectRetrieveQuery({id: projectId || 0}, { skip: !projectId })
  const { data: models, isLoading: isModelsLoading } = useCombinedModelListQuery({projectId: projectId || 0}, { skip: !projectId})
  const { data: protocols, error: protocolsError, isLoading: isProtocolsLoading } = useProtocolListQuery({projectId: projectId || 0}, { skip: !projectId})
  const model = models?.[0] || null;
  const [ updateModel ]  = useCombinedModelUpdateMutation()
  const { data: variables, isLoading: isVariablesLoading } = useVariableListQuery({ dosedPkModelId: model?.id || 0 }, { skip: !model?.id })
  const { data: simulations, isLoading: isSimulationsLoading } = useSimulationListQuery({projectId: projectId || 0}, { skip: !projectId })
  const [updateSimulation] = useSimulationUpdateMutation();
  const simulation = useMemo(() => {
    return simulations?.[0] || undefined
  }, [simulations]);


  const defaultModel: CombinedModelRead = {
    id: 0,
    name: '',
    project: projectId || 0,
    mappings: [],
    derived_variables: [],
    components: '',
    variables: [],
    mmt: '',
    time_unit: 0,
    is_library_model: false,
  };
  const { reset, handleSubmit, control, formState: { isDirty } } = useForm<CombinedModel>({
    defaultValues: model || defaultModel
  });
  useDirty(isDirty);

  
  useEffect(() => {
    if (model) {
      reset(model);
    }
  }, [model, reset]);

  const submit = handleSubmit((data: CombinedModel) => {
    if (!model) {
      return;
    }
    // if either of the pd_models have changed, need to remove the mappings
    if (data.pd_model !== model?.pd_model || data.pd_model2 !== model?.pd_model2) {
      data.mappings = [];
    }
    // if only pd_model has changed, need to clear pd_model2
    if (data.pd_model !== model?.pd_model) {
      data.pd_model2 = null;
    }

    return updateModel({ id: model.id, combinedModel: data }).then((response) => {
      if ('data' in response) {
        // if the pk_model has changed, need to reset the simulation time_max_unit
        if ((data.pk_model !== model?.pk_model) && simulation) {
          const time_max_unit = response.data.time_unit;
          updateSimulation({ id: simulation.id, simulation: { ...simulation, time_max_unit } });
        }
      }
    });
  });

  

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isDirty) {
        submit();
      }
    }, 1000);

    return () => clearInterval(intervalId);
    
  }, [submit, isDirty]);


  if (isProjectLoading || isModelsLoading || isVariablesLoading) {
    return <div>Loading...</div>;
  }

  if (!model || !project || !variables) {
    return <div>Not found</div>;
  }

  let tabErrors: {[key: string]: string} = {};
  if (model.pk_model === null) {
    tabErrors['PK/PD Model'] = 'Please select a PK model to simulate';
  }
  if (model.pd_model && model.mappings.length === 0) {
    tabErrors['Map Variables'] = 'Please select a PK variable to link PK and PD models (Link to PD column)';
  }
  if (protocols && protocols.length === 0) {
    tabErrors['Map Variables'] = 'Please select a dosing compartment';
  }


  return (
    <DynamicTabs tabNames={["PK/PD Model", "Map Variables", "Parameters"]} tabErrors={tabErrors}>
      <TabPanel>
        <PKPDModelTab model={model} project={project} control={control} updateModel={updateModel} />
      </TabPanel>
      <TabPanel>
        <MapVariablesTab model={model} project={project} control={control} variables={variables} />
      </TabPanel>
      <TabPanel>
        <ParametersTab model={model} project={project} control={control} variables={variables} />
      </TabPanel>
    </DynamicTabs>
  );
}

export default Model;
