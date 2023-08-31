import * as React from 'react';
import { CombinedModel, CombinedModelUpdateApiArg, Pharmacokinetic, Project, usePharmacodynamicListQuery, usePharmacokineticListQuery } from '../../app/backendApi';
import { Control } from 'react-hook-form';
import { FormControlLabel, Select, Stack, TextField as MuiTextField, Typography, Grid, Checkbox as MuiCheckbox } from '@mui/material';
import SelectField from '../../components/SelectField';
import { Check } from '@mui/icons-material';
import Checkbox from '../../components/Checkbox';
import FloatField from '../../components/FloatField';

interface Props {
    model: CombinedModel;
    project: Project;
    control: Control<CombinedModel>;
    updateModel: (data: CombinedModelUpdateApiArg) => void;
}

const PKPDModelTab: React.FC<Props> = ({ model, project, control }: Props ) => {
    // get list of pd models
    const {data: pdModels, error: pdModelError, isLoading: pdModelLoading } = usePharmacodynamicListQuery();
    const {data: pkModels, error: pkModelError, isLoading: pkModelLoading } = usePharmacokineticListQuery();
    const [showCode, setShowCode] = React.useState(false);

    if (pdModelLoading || pkModelLoading) {
        return (
            <div>
                Loading...
            </div>
        );
    }
    if (!pdModels || !pkModels) {
      return (
        <div>
          Error loading models.
        </div>
      );
    }

    const clinical = project.species === 'H';
    const pkModelsFiltered = pkModels.filter((model: Pharmacokinetic) => !model.name.includes(!clinical ? '_clinical' : '_preclinical'));
    const pdModelsFiltered = pdModels.filter((model) => model.name !== 'tumour_growth_inhibition_model_koch' && model.name !== 'tumour_growth_inhibition_model_koch_reparametrised')


    let pd_model_options: { value: number | string, label: string }[] = pdModelsFiltered.map((model) => {
        return { value: model.id, label: model.name };
    });
    pd_model_options.push({ value: '', label: 'None' });
    let pk_model_options = pkModelsFiltered.map((model) => {
        return { value: model.id, label: model.name };
    });
    const pk_model_map = pkModels.reduce((map, model) => {
        map[model.id] = model;
        return map;
    }, {} as {[key: number]: any});
    const pd_model_map = pdModels.reduce((map, model) => {
        map[model.id] = model;
        return map;
    }, {} as {[key: number]: any});

    const pdIsTumourGrowth = model.pd_model && pd_model_map[model.pd_model].name.includes('tumour_growth') && !pd_model_map[model.pd_model].name.includes('inhibition');
    let pd_model2_options: { value: number | string, label: string }[] = pdModelsFiltered.filter((model) => model.name.includes('tumour_growth_inhibition')).map((model) => {
        return { value: model.id, label: model.name };
    });
    pd_model2_options.push({ value: '', label: 'None' });
    const isTMDDmodel = model.pk_model ? pk_model_map[model.pk_model].name.includes('tmdd') : false;

    return (
      <Grid container spacing={2}>
        <Grid container item spacing={2}>
          <Grid item xs={3}>
            <SelectField label="PK Model" name="pk_model" control={control} options={pk_model_options} formControlProps={{ fullWidth: true }}/>
          </Grid>
          <Grid item xs={5}>
          <Typography>
            {model.pk_model ? pk_model_map[model.pk_model].description : ''}
          </Typography>
          </Grid>
          <Grid item xs={4}>
          <Checkbox label="Saturation" name="has_saturation" control={control} checkboxFieldProps={{ disabled: isTMDDmodel || !model.pk_model }} />
          <Checkbox label="Effect Compartment" name="has_effect" control={control} checkboxFieldProps={{ disabled: !model.pk_model }}  />
          <Checkbox label="Lag Time" name="has_lag" control={control} checkboxFieldProps={{ disabled: !model.pk_model }}  />
          <Checkbox label="Bioavailability" name="has_bioavailability" control={control} checkboxFieldProps={{ disabled: !model.pk_model }}  />
          </Grid>
        </Grid>
        <Grid container item spacing={2}>
          <Grid item xs={3}>
            <SelectField label="PD Model" name="pd_model" control={control} options={pd_model_options}  formControlProps={{ fullWidth: true }}/>
          </Grid>
          <Grid item xs={5}>
            <Typography>
              {model.pd_model ? pd_model_map[model.pd_model].description : ''}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            { model.pd_model && (
              <Checkbox label="Hill Coefficient" name="has_hill_coefficient" control={control} checkboxFieldProps={{ disabled: !model.pd_model }} />
            )}
          </Grid>
          { pdIsTumourGrowth && (
          <>
            <Grid item xs={3}>
              <SelectField label="Secondary PD Model" name="pd_model2" control={control} options={pd_model2_options} />
            </Grid>
            <Grid item xs={5}>
              <Typography>
                {model.pd_model2 ? pd_model_map[model.pd_model2].description : ''}
              </Typography>
            </Grid>
          </>
          )}
          <Grid item xs={12}>
          <FormControlLabel control={<MuiCheckbox checked={showCode} onChange={(e) => setShowCode(e.target.checked)}/>} label="Show Code" />
          </Grid>
          { showCode && (
          <Grid item xs={12}>
            <Typography
              sx={{ whiteSpace: 'pre-wrap'}}
            >
            { model.mmt }
            </Typography>
          </Grid>
          )}
        </Grid>
      </Grid>
    );
}

export default PKPDModelTab;
