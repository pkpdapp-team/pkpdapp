import * as React from 'react';
import { CombinedModel, CombinedModelUpdateApiArg, Project, usePharmacodynamicListQuery, usePharmacokineticListQuery } from '../../app/backendApi';
import { Control } from 'react-hook-form';
import { Select, Stack, Typography } from '@mui/material';
import SelectField from '../../components/SelectField';

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


    return (
        <div>
          <Stack direction="column" spacing={2}>
            <SelectField label="PK Model" name="pk_model" control={control} options={pk_model_options} />
            <SelectField label="PD Model" name="pd_model" control={control} options={pd_model_options} />
          </Stack>
        </div>
    );
}

export default PKPDModelTab;
