import { FC, useEffect } from "react";
import DosingProtocols from "./DosingProtocols";
import CreateDosingProtocols from "./CreateDosingProtocols";
import { StepperState } from "../LoadDataStepper";
import { useSelector } from "react-redux";
import { RootState } from "../../../app/store";
import {
  useCombinedModelListQuery,
  useProjectRetrieveQuery,
  useProtocolListQuery,
  useUnitListQuery,
  useVariableListQuery,
} from "../../../app/backendApi";

interface IMapDosing {
  state: StepperState;
  firstTime: boolean;
  notificationsInfo: {
    isOpen: boolean;
    count: number;
  };
}

function useApiQueries() {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;
  const { data: project } = useProjectRetrieveQuery(
    { id: projectId || 0 },
    { skip: !projectId },
  );
  const { data: projectProtocols } = useProtocolListQuery(
    { projectId: projectIdOrZero },
    { skip: !projectId },
  );
  const { data: models = [] } = useCombinedModelListQuery(
    { projectId: projectIdOrZero },
    { skip: !projectId },
  );
  const { data: units } = useUnitListQuery(
    { compoundId: project?.compound },
    { skip: !project || !project.compound },
  );
  const amountUnit = units?.find((unit) => unit.symbol === "pmol");
  const [model] = models;
  const { data: variables } = useVariableListQuery(
    { dosedPkModelId: model?.id || 0 },
    { skip: !model?.id },
  );

  const loading = [project, projectProtocols, units, variables];

  return {
    isLoading: loading.some((x) => !x),
    amountUnit,
    project,
    projectProtocols,
    units,
    variables,
  };
}

const MapDosing: FC<IMapDosing> = ({
  state,
  notificationsInfo,
}: IMapDosing) => {
  // Derived state from the uploaded CSV data.
  const amountUnitField =
    state.fields.find((field) =>
      ["Amount Unit", "Unit"].includes(state.normalisedFields.get(field) || ""),
    ) || "Amount Unit";
  const administrationIdField = state.fields.find(
    (field) => state.normalisedFields.get(field) === "Administration ID",
  );

  // Fetch API data.
  const { isLoading, amountUnit, project, projectProtocols, units, variables } =
    useApiQueries();

  useEffect(() => {
    const hasInvalidUnits =
      !!amountUnitField &&
      state.data
        .map((row) => row[amountUnitField])
        .some((symbol) => !units?.find((unit) => unit.symbol === symbol));
    if (
      !isLoading &&
      hasInvalidUnits &&
      amountUnitField !== "Amount Unit" &&
      state.normalisedFields.get(amountUnitField) !== "Ignore"
    ) {
      const newNormalisedFields = new Map(state.normalisedFields);
      newNormalisedFields.set(amountUnitField, "Ignore");
      newNormalisedFields.set("Amount Unit", "Amount Unit");
      state.normalisedFields = newNormalisedFields;
    }
  }, [amountUnitField, isLoading, state, units]);

  if (isLoading) {
    return null;
  }

  const dosingCompartments = projectProtocols?.map((protocol) => {
    return (
      variables?.find((variable) => variable.id === protocol.variable)?.qname ||
      ""
    );
  });
  const uniqueDosingCompartments = [...new Set(dosingCompartments)];

  return state.hasDosingRows ? (
    <DosingProtocols
      administrationIdField={administrationIdField || "Administration ID"}
      amountUnitField={amountUnitField}
      amountUnit={amountUnit}
      state={state}
      units={units || []}
      variables={variables || []}
      notificationsInfo={notificationsInfo}
      project={project!}
    />
  ) : (
    <CreateDosingProtocols
      administrationIdField={administrationIdField || "Administration ID"}
      amountUnitField={amountUnitField || ""}
      dosingCompartments={uniqueDosingCompartments}
      state={state}
      units={units || []}
      variables={variables || []}
      notificationsInfo={notificationsInfo}
      project={project!}
    />
  );
};

export default MapDosing;
