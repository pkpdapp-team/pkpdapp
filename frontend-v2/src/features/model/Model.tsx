import { useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import { CombinedModel, CombinedModelRead, ProjectRead, useCombinedModelListQuery, useCombinedModelSetParamsToDefaultsUpdateMutation, useCombinedModelUpdateMutation, useCompoundRetrieveQuery, usePharmacokineticListQuery, usePharmacokineticRetrieveQuery, useProjectRetrieveQuery, useProjectUpdateMutation, useProtocolDestroyMutation, useProtocolListQuery, useSimulationListQuery, useSimulationUpdateMutation, useUnitListQuery, useVariableListQuery, useVariableUpdateMutation } from '../../app/backendApi';
import { useForm } from 'react-hook-form';
import { useEffect, useMemo } from 'react';
import { DynamicTabs, TabPanel } from '../../components/DynamicTabs';
import MapVariablesTab from './MapVariablesTab';
import PKPDModelTab from './PKPDModelTab';
import ParametersTab from './ParametersTab';
import useDirty from '../../hooks/useDirty';
import { getConstVariables, resetToSpeciesDefaults } from './resetToSpeciesDefaults';

export type FormData = {
  project: ProjectRead;
  model: CombinedModel;
};

const Model: React.FC = () => {
  const projectId = useSelector((state: RootState) => state.main.selectedProject);
  const { data: project, isLoading: isProjectLoading } = useProjectRetrieveQuery({id: projectId || 0}, { skip: !projectId })
  const { data: compound, isLoading: isLoadingCompound } = useCompoundRetrieveQuery({ id: project?.compound || 0}, { skip: !project || !project.compound});
  const { data: models, isLoading: isModelsLoading } = useCombinedModelListQuery({projectId: projectId || 0}, { skip: !projectId})
  const { data: protocols, error: protocolsError, isLoading: isProtocolsLoading } = useProtocolListQuery({projectId: projectId || 0}, { skip: !projectId})
  const model = models?.[0] || null;
  const [ updateModel ]  = useCombinedModelUpdateMutation()
  const { data: variables, isLoading: isVariablesLoading } = useVariableListQuery({ dosedPkModelId: model?.id || 0 }, { skip: !model?.id })
  const { data: simulations, isLoading: isSimulationsLoading } = useSimulationListQuery({projectId: projectId || 0 }, { skip: !projectId })
  const { data: units, isLoading: isLoadingUnits } = useUnitListQuery({ compoundId: project?.compound}, { skip: !project || !project.compound});
  const [updateSimulation] = useSimulationUpdateMutation();
  const simulation = useMemo(() => {
    return simulations?.[0] || undefined
  }, [simulations]);
  const [ updateProject, { isLoading: isUpdatingProject } ] = useProjectUpdateMutation()
  const [ setParamsToDefault ] = useCombinedModelSetParamsToDefaultsUpdateMutation();


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
  const defaultProject: ProjectRead = {
    id: 0,
    user_access: [],
    name: '',
    created: '',
    compound: 0,
    users: [],
    protocols: [],
  }
  
  const defaultValues: FormData = {
    project: defaultProject,
    model: defaultModel,
  };

  const { reset, handleSubmit, control, formState: { isDirty } } = useForm<FormData>({
    defaultValues,
  });

  useDirty(isDirty);
  
  useEffect(() => {
    if (model && project) {
      reset({ model, project });
    }
  }, [model, project, reset]);

  const submit = handleSubmit((data: FormData) => {
    if (!model || !project) {
      return;
    }
    
    // if only pd_model has changed, need to clear pd_model2
    if (data.model.pd_model !== model?.pd_model) {
      data.model.pd_model2 = null;
    }
    
    // if species changed then update project
    if (data.project.species !== project.species) {
      updateProject({ id: project.id, project: { ...project, species: data.project.species }, });

      // if species has changed, then clear the models
      data.model.pk_model = null;
      data.model.pd_model = null;
      data.model.pd_model2 = null;
    }
    return updateModel({ id: model.id, combinedModel: data.model }).then((response) => {
      if ('data' in response) {
        // if the pk_model has changed, need to reset the simulation time_max_unit and set default parameters again
        if ((data.model.pk_model !== model?.pk_model) && simulation) {
          const time_max_unit = response.data.time_unit;
          updateSimulation({ id: simulation.id, simulation: { ...simulation, time_max_unit } });
        }
        // if the pk model has changed or any of the checkboxes have changed, need to reset the parameters
        if (
          (data.model.pk_model !== model?.pk_model) || 
          (data.model.has_bioavailability !== model.has_bioavailability) || 
          (data.model.has_effect !== model.has_effect) ||
          (data.model.has_saturation !== model.has_saturation)
        ) {
          setParamsToDefault({ id: model.id, combinedModel: data.model });
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


  if (isProjectLoading || isModelsLoading || isVariablesLoading || isProtocolsLoading || isSimulationsLoading || isLoadingCompound || isLoadingUnits) {
    return <div>Loading...</div>;
  }

  if (!model || !project || !variables || !protocols || !compound || !units) {
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
        <MapVariablesTab model={model} project={project} control={control} variables={variables} units={units} compound={compound} />
      </TabPanel>
      <TabPanel>
        <ParametersTab model={model} project={project} control={control} variables={variables} units={units} compound={compound} />
      </TabPanel>
    </DynamicTabs>
  );
}

export default Model;
