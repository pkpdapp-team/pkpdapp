import { useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import { CombinedModel, useCombinedModelListQuery, useCombinedModelUpdateMutation, useProjectRetrieveQuery, useVariableListQuery } from '../../app/backendApi';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { DynamicTabs, TabPanel } from '../../components/DynamicTabs';
import MapVariablesTab from './MapVariablesTab';
import PKPDModelTab from './PKPDModelTab';
import ParametersTab from './ParametersTab';


const Model: React.FC = () => {
  const projectId = useSelector((state: RootState) => state.main.selectedProject);
  const { data: project, isLoading: isProjectLoading } = useProjectRetrieveQuery({id: projectId || 0})
  const { data: models, isLoading: isModelsLoading } = useCombinedModelListQuery({projectId: projectId || 0})
  const model = models?.[0] || null;
  const [ updateModel ]  = useCombinedModelUpdateMutation()
  const { data: variables, isLoading: isVariablesLoading } = useVariableListQuery({ dosedPkModelId: model?.id || 0 })

  const defaultModel: CombinedModel = {
    id: 0,
    name: '',
    project: projectId || 0,
    mappings: [],
    components: '',
    variables: [],
    mmt: '',
  };
  const { reset, handleSubmit, control, formState: { isDirty } } = useForm<CombinedModel>({
    defaultValues: model || defaultModel
  });

  
  useEffect(() => {
    console.log('resetting model')
    if (model) {
      reset(model);
    }
  }, [model, reset]);
  
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isDirty) {
        console.log('saving model')
        handleSubmit((data) => updateModel({ id: data.id, combinedModel: data }))();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [handleSubmit, isDirty, updateModel]);
  

  if (isProjectLoading || isModelsLoading || isVariablesLoading) {
    return <div>Loading...</div>;
  }

  if (!model || !project || !variables) {
    return <div>Not found</div>;
  }

  return (
    <DynamicTabs tabNames={["PK/PK Model", "Map Variables", "Parameters"]}>
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
