import * as React from 'react';
import { CombinedModel, Project, Variable } from '../../app/backendApi';
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
    const { fields: mappings, append, remove } = useFieldArray({
        control,
        name: "mappings",
    });

    return (
      <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
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
          {variables.filter(variable => variable.state).map((variable) => (
            <VariableRow key={variable.id} variable={variable} model={model} mappings={mappings} project={project} appendMapping={append} removeMapping={remove}/>
            ))}
        </TableBody>
      
      </Table>
    </TableContainer>
    );
}

export default MapVariablesTab;
