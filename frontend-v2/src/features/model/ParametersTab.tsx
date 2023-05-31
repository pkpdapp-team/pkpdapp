import * as React from 'react';
import { CombinedModel, Project } from '../../app/backendApi';
import { Control } from 'react-hook-form';
import { TableContainer, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import ParameterRow from './ParameterRow';

interface Props {
    model: CombinedModel;
    project: Project;
    control: Control<CombinedModel>;
}

const ParametersTab: React.FC<Props> = ({ model, project, control }: Props ) => {
    return (
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
          {model.variables.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>No variables found</TableCell>
            </TableRow>
          )}
          {model.variables.map((variable) => (
            <ParameterRow key={variable} variableId={variable} model={model} project={project}/>
            ))}
        </TableBody>
      
      </Table>
    </TableContainer>
    );
}

export default ParametersTab;
