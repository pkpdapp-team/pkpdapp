import { FC } from 'react';
import DosingProtocols from './DosingProtocols';
import CreateDosingProtocols from './CreateDosingProtocols';
import { StepperState } from "./LoadDataStepper";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  useCombinedModelListQuery,
  useProjectRetrieveQuery,
  useUnitListQuery,
  useVariableListQuery
} from "../../app/backendApi";

interface IMapDosing {
  state: StepperState;
  firstTime: boolean;
}

const MapDosing: FC<IMapDosing> = ({ state, firstTime }: IMapDosing) => {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;
  const { data: project } =
    useProjectRetrieveQuery({ id: projectId || 0 }, { skip: !projectId });
  const isPreclinical = project?.species !== 'H';
  const { data: models = [] } =
    useCombinedModelListQuery(
      { projectId: projectIdOrZero },
      { skip: !projectId },
    );
  const { data: units } = useUnitListQuery(
    { compoundId: project?.compound },
    { skip: !project || !project.compound },
  );
  const amountUnit = isPreclinical
    ? units?.find((unit) => unit.symbol === "pmol/kg")
    : units?.find((unit) => unit.symbol === "pmol");
  const [model] = models;
  const { data: variables } = useVariableListQuery(
    { dosedPkModelId: model?.id || 0 },
    { skip: !model?.id },
  );

  const amountField = state.fields.find(
    (field, i) => state.normalisedFields[i] === 'Amount'
  );
  const amountUnitField = state.fields.find(
    (field, i) => ['Amount Unit', 'Unit'].includes(state.normalisedFields[i])
  );
  const administrationIdField = state.fields.find(
    (field, i) => state.normalisedFields[i] === 'Administration ID'
  );
  const hasDosingRows = amountField && administrationIdField;
  
  return hasDosingRows ? 
    <DosingProtocols
      administrationIdField={administrationIdField || ''}
      amountUnitField={amountUnitField || ''}
      amountUnit={amountUnit}
      state={state}
      units={units || []}
      variables={variables || []}
    /> :
    <CreateDosingProtocols
      administrationIdField={'Group'}
      amountUnitField={amountUnitField || ''}
      amountUnit={amountUnit}
      state={state}
      units={units || []}
      variables={variables || []}
    />;
}

export default MapDosing;

