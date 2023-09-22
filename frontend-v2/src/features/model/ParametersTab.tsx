import * as React from 'react';
import { CombinedModel, Project, Variable, useCompoundRetrieveQuery, usePharmacokineticRetrieveQuery, useUnitListQuery, useVariableUpdateMutation } from '../../app/backendApi';
import { Control } from 'react-hook-form';
import { TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Stack, Button } from '@mui/material';
import ParameterRow from './ParameterRow';
import { param_default as paramDefaults } from './param_default';
import HelpButton from '../../components/HelpButton';

interface Props {
    model: CombinedModel;
    project: Project;
    control: Control<CombinedModel>;
    variables: Variable[];
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

    const libraryParamOrder = ['Cl', 'Clmax', 'Km', 'Kss', 'KD', 'V1', 'V2', 'V3', 'Q1', 'Q2', 'CT1_0', 'kdeg', 'kint', 'koff', 'F', 'ka', 'tlag', 'Kp', 'ke0'];
    const qnameLibraryOrder = libraryParamOrder.toReversed().map(param => 'PKCompartment.' + param);
    const paramPriority = (param: Variable) => {
      let priority = 0;
      if (param.qname.endsWith("_ud")) {
        priority = 1;
      } else if (param.qname.startsWith("PK")) {
        priority = 3;
        let index = qnameLibraryOrder.indexOf(param.qname);
        if (index > -1) {
          priority = 4 + index;
        }
      } else if (param.qname.startsWith("PD")) {
        priority = 2;
      }
      return priority;
    }

    let constVariables = variables.filter(variable => variable.constant);
    constVariables.sort((a, b) => {
      return paramPriority(b) - paramPriority(a);
    })

    const noReset = !pkModel || !project.species || project.species === 'O';

    const resetToSpeciesDefaults = () => {
        if (noReset || !project.species) {
            return;
        }
        const modelName: string = pkModel.name.replace("_clinical", "").replace("_preclinical", "").replace("tmdd_full", "tmdd").replace("tmdd_QSS", "tmdd").replace("production", "").replace("elimination", "");
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
      <Button variant="contained" color="primary" onClick={resetToSpeciesDefaults} disabled={noReset} sx={{width: 270}}>Reset to Species Defaults</Button>
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
