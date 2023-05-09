import { Grid, Stack, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import { Compound, useCompoundRetrieveQuery, useProjectRetrieveQuery } from '../../app/backendApi';
import { useForm } from 'react-hook-form';
import TextField from '../../components/TextField';
import UnitField from '../../components/UnitField';
import SelectField from '../../components/SelectField';


const Drug: React.FC = () => {
  const projectId = useSelector((state: RootState) => state.main.selectedProject);
  const { data: project, error: projectError, isLoading: isProjectLoading } = useProjectRetrieveQuery({id: projectId || 0})
  const { data: compound, error: compoundError, isLoading: isCompoundLoading } = useCompoundRetrieveQuery({id: project?.compound || 0})

  // create a form for the compound data using react-hook-form
  const { reset, handleSubmit, control } = useForm<Compound>({
    defaultValues: compound || { name: '', description: '', compound_type: 'SM' }
  });

  if (isProjectLoading || isCompoundLoading) {
    return <div>Loading...</div>;
  }

  if (!compound || !project) {
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
  
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Typography variant="h6" component="h2" gutterBottom>
          Drug Properties
        </Typography>
        <Stack direction="row" spacing={2}>
          <TextField label={'Molecular Mass'} name={'molecular_mass'} control={control} />
          <UnitField label={'Unit'} name={'molecular_mass_unit'} control={control} baseUnitId={compound.molecular_mass_unit} />
        </Stack>

        <TextField label="Fraction Unbound Plasma" name="fraction_unbound_plasma" control={control} />
        <TextField label="Blood to Plasma Ratio" name="blood_to_plasma_ratio" control={control} />

        <Stack direction="row" spacing={2}>
          <TextField label="Intrinsic Clearence" name="intrinsic_clearance" control={control} />
          <SelectField label="Intrinsic Clearence Assay" name="intrinsic_clearance_assay" control={control} options={intrinsic_clearence_assay_options} />
        </Stack>

        <TextField label="Fraction Unbound Plasma Including Cells" name="fraction_unbound_including_cells" control={control} />
      </Grid>
      <Grid item xs={12} md={6}>
        <Typography variant="h6" component="h2" gutterBottom>
          Target Properties
        </Typography>

        <Stack direction="row" spacing={2}>
          <TextField label={'Molecular Mass'} name={'target_molecular_mass'} control={control} />
          <UnitField label={'Unit'} name={'target_molecular_mass_unit'} control={control} baseUnitId={compound.molecular_mass_unit} />
        </Stack>

        <Stack direction="row" spacing={2}>
          <TextField label="Target Concentration" name={'target_concentration'} control={control} />
          <UnitField label={'Unit'} name={'target_concentration_unit'} control={control} baseUnitId={compound.target_molecular_mass_unit} />
        </Stack>

        <Stack direction="row" spacing={2}>
          <TextField label="Dissociation Constant" name={'dissociation_constant'} control={control} />
          <UnitField label={'Unit'} name={'dissociation_unit'} control={control} baseUnitId={compound.dissociation_unit} />
        </Stack>

        <SelectField label="Domain" name={'is_soluble'} control={control} options={is_soluble_options} />
      </Grid>
    </Grid>
  );
}

export default Drug;
