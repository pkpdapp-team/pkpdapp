import { Button, Grid, IconButton, List, ListItem, ListItemSecondaryAction, Stack, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import { CombinedModel, Compound, useCombinedModelListQuery, useCombinedModelRetrieveQuery, useCombinedModelUpdateMutation, useCompoundRetrieveQuery, useCompoundUpdateMutation, useProjectRetrieveQuery } from '../../app/backendApi';
import { useFieldArray, useForm, useFormState } from 'react-hook-form';
import FloatField from '../../components/FloatField';
import UnitField from '../../components/UnitField';
import SelectField from '../../components/SelectField';
import { useEffect } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { DynamicTabs, TabPanel } from '../../components/DynamicTabs';
import TranslationTab from './TranslationTab';
import MapVariablesTab from './MapVariablesTab';
import PKPDModelTab from './PKPDModelTab';
import ParametersTab from './ParametersTab';


const Model: React.FC = () => {
  const projectId = useSelector((state: RootState) => state.main.selectedProject);
  const { data: project, error: projectError, isLoading: isProjectLoading } = useProjectRetrieveQuery({id: projectId || 0})
  const { data: models, error: modelsError, isLoading: isModelsLoading } = useCombinedModelListQuery({projectId: projectId || 0})
  const model = models?.[0] || null;
  const [ updateModel, { isLoading: updateModelLoading } ]  = useCombinedModelUpdateMutation()

  const defaultModel: CombinedModel = {
    id: 0,
    name: '',
    project: projectId || 0,
    mappings: [],
    components: '',
    variables: [],
    mmt: '',
  };
  const { reset, watch, handleSubmit, control, formState: { isDirty } } = useForm<CombinedModel>({
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
  

  if (isProjectLoading || isModelsLoading) {
    return <div>Loading...</div>;
  }

  if (!model || !project) {
    return <div>Not found</div>;
  }

  return (
    <DynamicTabs tabNames={["PK/PK Model", "Map Variables", "Parameters", "Translation"]}>
      <TabPanel>
        <PKPDModelTab model={model} project={project} control={control} updateModel={updateModel} />
      </TabPanel>
      <TabPanel>
        <MapVariablesTab model={model} project={project} control={control} />
      </TabPanel>
      <TabPanel>
        <ParametersTab model={model} project={project} control={control} />
      </TabPanel>
      <TabPanel>
        <TranslationTab model={model} project={project} control={control} />
      </TabPanel>
    </DynamicTabs>
  );
}

export default Model;
