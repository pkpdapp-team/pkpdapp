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
    
    const { data: units, isLoading: isLoadingUnits } = useUnitListQuery({ compoundId: project.compound}, { skip: !project.compound });
    const { data: compound, isLoading: isLoadingCompound } = useCompoundRetrieveQuery({id: project.compound})

    if (isLoadingUnits || isLoadingCompound) {
      return null;
    }
    if (units === undefined || compound === undefined) {
      return null;
    }

    const concentrationUnit = units.find((unit) => unit.symbol === "pmol/L");
    const amountUnit = units.find((unit) => unit.symbol === "pmol");
    if (concentrationUnit === undefined || amountUnit === undefined) {
      return (<>No concentration or amount unit found</>);
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
      const aIsConcentration = concentrationUnit?.compatible_units.find((unit) => parseInt(unit.id) === a.unit) !== undefined;
      const aIsAmount = amountUnit?.compatible_units.find((unit) => parseInt(unit.id) === a.unit) !== undefined;
      const bIsConcentration = concentrationUnit?.compatible_units.find((unit) => parseInt(unit.id) === b.unit) !== undefined;
      const bIsAmount = amountUnit?.compatible_units.find((unit) => parseInt(unit.id) === b.unit) !== undefined;

      const aValue = aIsConcentration ? 1 : (aIsAmount ? 2 : 0);
      const bValue = bIsConcentration ? 1 : (bIsAmount ? 2 : 0);

      if (aValue !== bValue) {
        return bValue - aValue;
      } else {
        return a.name > b.name ? 1 : -1;
      }
      
    })

    const effectVariable = variables.find((variable) => variable.qname === "PDCompartment.C_Drug" || variable.qname === "PDCompartment2.C_Drug");
    const timeVariable = variables.find((variable) => variable.binding === "time");
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
            <TableCell>Link to FUP</TableCell>
            <TableCell>Link to BPR</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {variables.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>No variables found</TableCell>
            </TableRow>
          )}
          {timeVaryingVariables.map((variable) => (
            <VariableRow key={variable.id} variable={variable} model={model} control={control} project={project} compound={compound} effectVariable={effectVariable} units={units} timeVariable={timeVariable}/>
            ))}
        </TableBody>
      
      </Table>
    </TableContainer>
    );
}

export default MapVariablesTab;
