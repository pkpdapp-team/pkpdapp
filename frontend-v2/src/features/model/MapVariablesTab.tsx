import * as React from 'react';
import { CombinedModel, Project, Variable, useCompoundRetrieveQuery, useUnitListQuery, useUnitRetrieveQuery } from '../../app/backendApi';
import { Control, useFieldArray } from 'react-hook-form';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip } from '@mui/material';
import VariableRow from './VariableRow';
import HelpButton from '../../components/HelpButton';

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

    const dosingCompartmentHelp = (
      <>
      <p>IV dosing: A1 for PK models and A1_f (full TMDD models) or A1_t (for QSS models)</p>
      <p>PO/SC dosing: Aa</p>
      <p>For custom-made models, please consult your tM&S expert</p>
      </>
    );

    const sROHelp = (
      <p>The receptor occupancy for SM and LM (calc_RO) is calculated from the total drug concentration (typcially C1 or Ce), the total target concentration and the KD value of drug-target binding</p>
    );

    const unboundHelp = (
      <p>For SM, the unbound concentration in plasma is calculated by multiplying the central drug concentration (typically C1) by fup (see Drug Target tab)</p>
    );

    const bloodHelp = (
      <p>For SM, the total concentration in blood is calculated by dividing the central drug concentration (typically C1) by BP (see Drug Target tab)</p>
    );

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
            <Tooltip title="Select dosing compartment">
            <TableCell>Dosing Compartment<HelpButton title={'Dosing Compartment'}>{dosingCompartmentHelp}</HelpButton></TableCell>
            </Tooltip>
            <Tooltip title="Select drug concentration that drives PD effects">
            <TableCell>Link to PD</TableCell>
            </Tooltip>
            <Tooltip title="Select drug concentration that drives RO">
            <TableCell>Link to Static Receptor Occupancy<HelpButton title={'Link to Static Receptor Occupancy'}>{sROHelp}</HelpButton></TableCell>
            </Tooltip>
            <Tooltip title="Unbound concentration is calculated">
            <TableCell>Unbound Concentration<HelpButton title={'Unbound Concentration'}>{unboundHelp}</HelpButton></TableCell>
            </Tooltip>
            <Tooltip title="Blood concentration is calculated">
            <TableCell>Blood Concentration<HelpButton title={'Blood concentration'}>{bloodHelp}</HelpButton></TableCell>
            </Tooltip>
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
