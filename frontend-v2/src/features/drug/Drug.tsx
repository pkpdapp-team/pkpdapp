import { Box, Grid, IconButton, LinearProgress, List, ListItem, ListItemSecondaryAction, Stack, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import { Compound, useCompoundRetrieveQuery, useCompoundUpdateMutation, useProjectRetrieveQuery, useUnitListQuery } from '../../app/backendApi';
import { useFieldArray, useForm, useFormState } from 'react-hook-form';
import FloatField from '../../components/FloatField';
import UnitField from '../../components/UnitField';
import SelectField from '../../components/SelectField';
import { useEffect } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import TextField from '../../components/TextField';
import useDirty from '../../hooks/useDirty';
import { CompressOutlined } from '@mui/icons-material';


const Drug: React.FC = () => {
  const projectId = useSelector((state: RootState) => state.main.selectedProject);
  const { data: project, isLoading: isProjectLoading } = useProjectRetrieveQuery({id: projectId || 0}, { skip: !projectId })
  const { data: compound, isLoading: isCompoundLoading } = useCompoundRetrieveQuery({id: project?.compound || 0}, { skip: !project })
  const [ updateCompound ] = useCompoundUpdateMutation()
  const { data: units, isLoading: isLoadingUnits } = useUnitListQuery({ compoundId: project?.compound}, { skip: !project?.compound});


  // create a form for the compound data using react-hook-form
  const { reset, handleSubmit, control } = useForm<Compound>({
    defaultValues: compound || { name: '', description: '', compound_type: 'SM' }
  });
  const { isDirty } = useFormState({ control });

  useDirty(isDirty);
  
  const { fields: efficacy_experiments, append, remove } = useFieldArray({
    control,
    name: "efficacy_experiments",
  });

  useEffect(() => {
    reset(compound);
  }, [compound, reset]);

  const submit = handleSubmit((data) => {
    if (data && compound && (JSON.stringify(data) !== JSON.stringify(compound))) {
      updateCompound({ id: data.id, compound: data })
    }
  });
  
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isDirty) {
        submit();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [submit, isDirty]);



  useEffect(() => () => { submit(); }, []);
  
  
  const addNewEfficacyExperiment = () => {
    append({ id: 0, name: '', c50: compound?.target_concentration || 0, c50_unit: compound?.target_concentration_unit || 0,  hill_coefficient: 1, compound: compound?.id || 0 });
  };

  const deleteEfficacyExperiment = (index: number) => {
    remove(index);
  };


  if (isProjectLoading || isCompoundLoading || isLoadingUnits) {
    return <div>Loading...</div>;
  }

  if (!compound || !project || !units) {
    return <div>Not found</div>;
  }

  const intrinsic_clearence_assay_options = [
    { value: "MS", label: "Microsomes" },
    { value: "HC", label: "Hepatocytes" },
  ];

  const is_soluble_options = [
    { value: false, label: "Membrane-bound" },
    { value: true, label: "Soluble" },
  ];

  const isLM = compound.compound_type === 'LM';
  
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Typography variant="h6" component="h2" gutterBottom>
          Drug Properties
        </Typography>
        <Stack direction="column" spacing={2}>
          <Stack direction="row" spacing={2}>
            <FloatField label={'Molecular Mass'} name={'molecular_mass'} control={control} rules={{ required: true }} />
            <UnitField label={'Unit'} name={'molecular_mass_unit'} control={control} baseUnit={units.find(u => u.id == compound.molecular_mass_unit)} compound={compound} />
          </Stack>

          <FloatField label="Fraction Unbound Plasma" name="fraction_unbound_plasma" control={control} textFieldProps={{ disabled: isLM }} />
          <FloatField label="Blood to Plasma Ratio" name="blood_to_plasma_ratio" control={control} textFieldProps={{ disabled: isLM }} />

          <Stack direction="row" spacing={2}>
            <FloatField label="Intrinsic Clearence" name="intrinsic_clearance" control={control} textFieldProps={{ disabled: true }} />
            <SelectField label="Intrinsic Clearence Assay" name="intrinsic_clearance_assay" control={control} options={intrinsic_clearence_assay_options} selectProps={{ disabled: true }} />
          </Stack>

          <FloatField label="Fraction Unbound Plasma Including Cells" name="fraction_unbound_including_cells" control={control} textFieldProps={{ disabled: true }} />
        </Stack>
      </Grid>
      <Grid item xs={12} md={6}>
        <Typography variant="h6" component="h2" gutterBottom>
          Target Properties
        </Typography>

        <Stack direction="column" spacing={2}>
          <Stack direction="row" spacing={2}>
            <FloatField label={'Molecular Mass'} name={'target_molecular_mass'} control={control} rules={{ required: true }} />
            <UnitField label={'Unit'} name={'target_molecular_mass_unit'} control={control} baseUnit={units.find(u => u.id === compound.molecular_mass_unit)} compound={compound} />
          </Stack>

          <Stack direction="row" spacing={2}>
            <FloatField label="Target Concentration" name={'target_concentration'} control={control} />
            <UnitField label={'Unit'} name={'target_concentration_unit'} control={control} baseUnit={units.find(u => u.id === compound.target_concentration_unit)} compound={compound} />
          </Stack>

          <Stack direction="row" spacing={2}>
            <FloatField label="Dissociation Constant" name={'dissociation_constant'} control={control} />
            <UnitField label={'Unit'} name={'dissociation_unit'} control={control} baseUnit={units.find(u => u.id === compound.dissociation_unit)} compound={compound} />
          </Stack>

          <SelectField label="Domain" name={'is_soluble'} control={control} options={is_soluble_options} selectProps={{ disabled: true }} />
        </Stack>
      </Grid>
      <Grid item xs={12} md={6}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" component="h2" gutterBottom>
            Efficacy Experiments 
          </Typography>
          <IconButton onClick={addNewEfficacyExperiment}>
            <AddIcon />
          </IconButton>
        </div>
        <List>
        {efficacy_experiments.map((efficacy_experiment, index) => (
          <ListItem key={index}>
          <Stack direction="column" spacing={2} key={index}>
            <TextField label="Name" name={`efficacy_experiments.${index}.name`} control={control} />
            <Stack direction="row" spacing={2}>
              <FloatField label="C50" name={`efficacy_experiments.${index}.c50`} control={control} />
              <UnitField label={'Unit'} name={`efficacy_experiments.${index}.c50_unit`} control={control} baseUnit={units.find(u => u.id === efficacy_experiment.c50_unit)} compound={compound} />
            </Stack>
            <FloatField label="Hill-coefficient" name={`efficacy_experiments.${index}.hill_coefficient`} control={control} />
          </Stack>
          <ListItemSecondaryAction>
            <IconButton onClick={() => deleteEfficacyExperiment(index)}>
              <DeleteIcon />
            </IconButton>
          </ListItemSecondaryAction>
          </ListItem>
        ))}
        </List>
      </Grid>
    </Grid>
  );
}

export default Drug;