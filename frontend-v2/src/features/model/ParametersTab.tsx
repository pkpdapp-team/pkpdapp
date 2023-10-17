import * as React from 'react';
import { CombinedModel, CombinedModelRead, ProjectRead, VariableRead, useCompoundRetrieveQuery, usePharmacokineticRetrieveQuery, useUnitListQuery, useVariableUpdateMutation } from '../../app/backendApi';
import { Control } from 'react-hook-form';
import { TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Stack, Button, Tooltip } from '@mui/material';
import ParameterRow from './ParameterRow';
import { param_default as paramDefaults } from './param_default';
import HelpButton from '../../components/HelpButton';
import paramPriority from './paramPriority';

interface Props {
    model: CombinedModelRead;
    project: ProjectRead;
    control: Control<CombinedModel>;
    variables: VariableRead[];
}


const ParametersTab: React.FC<Props> = ({ model, project, control, variables }) => {

    const { data: compound, isLoading: isLoadingCompound } = useCompoundRetrieveQuery({ id: project.compound}, { skip: !project.compound});
    const [updateVariable] = useVariableUpdateMutation();
    const { data: pkModel } = usePharmacokineticRetrieveQuery({ id: model.pk_model || 0}, { skip: !model.pk_model });
    const { data: units, isLoading: isLoadingUnits } = useUnitListQuery({ compoundId: project.compound}, { skip: !project.compound});

    if (isLoadingUnits || isLoadingCompound) {
        return <div>Loading...</div>;
    }

    if (!units || !compound) {
        return <div>Units not found</div>;
    }

    let constVariables = variables.filter(variable => variable.constant);
    constVariables.sort((a, b) => {
      const overallOrder = paramPriority(a) - paramPriority(b);
      if (overallOrder !== 0) {
        // first sort by priority
        return overallOrder;
      } else {
        // otherwise use alphabetical ordering
        return a.name.localeCompare(b.name);
      }
    })

    const noReset = !pkModel || !project.species || project.species === 'O';

    const resetToSpeciesDefaults = () => {
        if (noReset || !project.species) {
            return;
        }
        const modelName: string = pkModel.name
          .replace("_clinical", "")
          .replace("_preclinical", "")
          .replace("tmdd_full_constant_target", "tmdd")
          .replace("tmdd_QSS_constant_target", "tmdd")
          .replace("tmdd_full", "tmdd")
          .replace("tmdd_QSS", "tmdd")
          .replace("production", "")
          .replace("elimination", "");
        const species: string = project.species;
        const compoundType: string = compound.compound_type || "SM";
        for (const variable of constVariables) {
            const varName = variable.name;
            let defaultVal = paramDefaults[modelName]?.[varName]?.[species]?.[compoundType];
            if (defaultVal?.unit === "dimensionless") {
              defaultVal.unit = '';
            }
            let defaultUnitId: number | undefined = defaultVal ? units.find(unit => unit.symbol === defaultVal.unit)?.id : undefined;
            let defaultValue: number | undefined = defaultVal?.value;
            if (varName.endsWith("_RO_KD")) {
              defaultValue = compound.dissociation_constant || undefined;
              defaultUnitId = compound.dissociation_unit;
            } else if (varName.endsWith("_RO_TC")) {
              defaultValue = compound.target_concentration || undefined;
              defaultUnitId = compound.target_concentration_unit;
            }
            if (!defaultValue || !defaultUnitId) {
              continue;
            }
            if (defaultUnitId) {
                updateVariable({ id: variable.id, variable: { ...variable, default_value: defaultValue, unit: defaultUnitId }});
            }
        }
    }

    return (
      <Stack spacing={2}>
      {noReset ? (
      <Tooltip title='No default parameters as "Other" has been selected as species (in "Projects")'>
        <span><Button variant="contained" color="primary" onClick={resetToSpeciesDefaults} disabled={noReset} sx={{width: 270}}>Reset to Species Defaults</Button></span>
      </Tooltip>
      ) : (
        <Button variant="contained" color="primary" onClick={resetToSpeciesDefaults} disabled={noReset} sx={{width: 270}}>Reset to Species Defaults</Button>
      )}
      <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Lower Bound</TableCell>
            <TableCell>Value</TableCell>
            <TableCell>Upper Bound</TableCell>
            <TableCell>Unit <HelpButton title='Unit Column'>Changing the units does not update the PKPD values. The user is responsible for the correctness of the values and units.</HelpButton> </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {constVariables.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>No variables found</TableCell>
            </TableRow>
          )}
          {constVariables.map((variable) => (
            <ParameterRow key={variable.id} variable={variable} model={model} project={project} units={units}/>
            ))}
        </TableBody>
      
      </Table>
    </TableContainer>
    </Stack>
    );
}

export default ParametersTab;
