import * as React from 'react';
import { CombinedModel, Project, Variable, usePharmacokineticRetrieveQuery, useVariableUpdateMutation } from '../../app/backendApi';
import { Control } from 'react-hook-form';
import { TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Stack, Button } from '@mui/material';
import ParameterRow from './ParameterRow';
import { param_default as paramDefaults } from './param_default';

interface Props {
    model: CombinedModel;
    project: Project;
    control: Control<CombinedModel>;
    variables: Variable[];
}


const ParametersTab: React.FC<Props> = ({ model, project, control, variables }) => {

    const [updateVariable] = useVariableUpdateMutation();
    const { data: pkModel } = usePharmacokineticRetrieveQuery({ id: model.pk_model || 0}, { skip: !model.pk_model });

    const constVariables = variables.filter(variable => variable.constant);

    const noReset = !pkModel || !project.species || project.species === 'O';

    const resetToSpeciesDefaults = () => {
        if (noReset || !project.species) {
            return;
        }
        const modelName: string = pkModel.name.replace("_clinical", "").replace("_preclinical", "").replace("tmdd_full", "tmdd").replace("tmdd_QSS", "tmdd").replace("production", "").replace("elimination", "");
        const species: string = project.species;
        for (const variable of constVariables) {
            const varName = variable.name;
            console.log(modelName, varName, species)
            const defaultVal = paramDefaults[modelName]?.[varName]?.[species];
            if (defaultVal) {
                updateVariable({ id: variable.id, variable: { ...variable, default_value: defaultVal.value }});
            }
        }
    }

    return (
      <Stack spacing={2}>
      <Button variant="contained" color="primary" onClick={resetToSpeciesDefaults} disabled={noReset}>Reset to Species Defaults</Button>
      <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Value</TableCell>
            <TableCell>Unit</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {constVariables.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>No variables found</TableCell>
            </TableRow>
          )}
          {constVariables.map((variable) => (
            <ParameterRow key={variable.id} variable={variable} model={model} project={project}/>
            ))}
        </TableBody>
      
      </Table>
    </TableContainer>
    </Stack>
    );
}

export default ParametersTab;
