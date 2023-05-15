import * as React from 'react';
import { CombinedModel, CombinedModelUpdateApiArg, Project, usePharmacodynamicListQuery, usePharmacokineticListQuery } from '../../app/backendApi';
import { Control } from 'react-hook-form';
import { Select, Stack, TextField as MuiTextField, Typography, Grid } from '@mui/material';
import SelectField from '../../components/SelectField';
import { Check } from '@mui/icons-material';
import Checkbox from '../../components/Checkbox';

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

    const pd_model_options = pdModels.map((model) => {
        return { value: model.id, label: model.name };
    });
    const pk_model_options = pkModels.map((model) => {
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



    return (
      <Grid container spacing={2}>
        <Grid container item spacing={2}>
          <Grid item xs={3}>
            <SelectField label="PK Model" name="pk_model" control={control} options={pk_model_options} />
          </Grid>
          <Grid item xs={5}>
          <Typography>
            {model.pk_model ? pk_model_map[model.pk_model].description : ''}
          </Typography>
          </Grid>
          <Grid item xs={4}>
          <Checkbox label="Saturation" name="has_saturation" control={control} />
          <Checkbox label="Effect Compartment" name="has_effect" control={control} />
          <Checkbox label="Lag Time" name="has_lag" control={control} />
          </Grid>
        </Grid>
        <Grid container item spacing={2}>
          <Grid item xs={3}>
            <SelectField label="PD Model" name="pd_model" control={control} options={pd_model_options} />
          </Grid>
          <Grid item xs={5}>
            <Typography>
              {model.pd_model ? pd_model_map[model.pd_model].description : ''}
            </Typography>
          </Grid>
          <Grid item xs={4}>
          <Checkbox label="Hill Coefficient" name="has_hill_coefficient" control={control} />
          </Grid>
        </Grid>
      </Grid>
    );
}

export default PKPDModelTab;
