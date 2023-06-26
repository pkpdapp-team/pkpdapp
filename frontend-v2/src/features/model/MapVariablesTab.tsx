import * as React from 'react';
import { CombinedModel, Project, Variable, useCompoundRetrieveQuery, useUnitListQuery, useUnitRetrieveQuery } from '../../app/backendApi';
import { Control, useFieldArray } from 'react-hook-form';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import VariableRow from './VariableRow';

interface Props {
    model: CombinedModel;
    project: Project;
    control: Control<CombinedModel>;
    variables: Variable[];
}

const MapVariablesTab: React.FC<Props> = ({ model, project, control, variables }: Props ) => {
    
    const { data: units, isLoading: isLoadingUnits } = useUnitListQuery();
    const { data: compound, isLoading: isLoadingCompound } = useCompoundRetrieveQuery({id: project.compound})

    if (isLoadingUnits || isLoadingCompound) {
      return null;
    }
    if (units === undefined || compound === undefined) {
      return null;
    }

    let timeVaryingVariables = variables.filter(variable => !variable.constant);
    timeVaryingVariables.sort((a, b) => {
      const aisPK = a.qname.startsWith("PK");
      const bisPK = b.qname.startsWith("PK");
      if (aisPK && !bisPK) {
        return -1;
      }
      if (!aisPK && bisPK) {
        return 1;
      }
      return a.name > b.name ? 1 : -1;
    })

    const effectVariable = variables.find((variable) => variable.qname === "PDCompartment.C_Drug" || variable.qname === "PDCompartment2.C_Drug");
    return (
      <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Unit</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Dosing Compartment</TableCell>
            <TableCell>Link to PD</TableCell>
            <TableCell>Link to Static Receptor Occupancy</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {variables.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>No variables found</TableCell>
            </TableRow>
          )}
          {timeVaryingVariables.map((variable) => (
            <VariableRow key={variable.id} variable={variable} model={model} control={control} project={project} compound={compound} effectVariable={effectVariable} units={units}/>
            ))}
        </TableBody>
      
      </Table>
    </TableContainer>
    );
}

export default MapVariablesTab;
