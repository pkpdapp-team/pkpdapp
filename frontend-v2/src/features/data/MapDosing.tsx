import { FC } from "react";
import DosingProtocols from "./DosingProtocols";
import CreateDosingProtocols from "./CreateDosingProtocols";
import { StepperState } from "./LoadDataStepper";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";
import {
  useCombinedModelListQuery,
  useProjectRetrieveQuery,
  useProtocolListQuery,
  useUnitListQuery,
  useVariableListQuery,
} from "../../app/backendApi";

interface IMapDosing {
  state: StepperState;
  firstTime: boolean;
  notificationsInfo: {
    isOpen: boolean;
    count: number;
  };
}

const MapDosing: FC<IMapDosing> = ({
  state,
  notificationsInfo,
}: IMapDosing) => {
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;
  const { data: project } = useProjectRetrieveQuery(
    { id: projectId || 0 },
    { skip: !projectId },
  );
  const isPreclinical = project?.species !== "H";
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
  const amountUnit = isPreclinical
    ? units?.find((unit) => unit.symbol === "pmol/kg")
    : units?.find((unit) => unit.symbol === "pmol");
  const [model] = models;
  const { data: variables } = useVariableListQuery(
    { dosedPkModelId: model?.id || 0 },
    { skip: !model?.id },
  );

  const amountField = state.fields.find(
    (field) => state.normalisedFields.get(field) === "Amount",
  );
  const amountUnitField =
    state.fields.find((field) =>
      ["Amount Unit", "Unit"].includes(state.normalisedFields.get(field) || ""),
    ) || "Amount Unit";
  const administrationIdField = state.fields.find(
    (field) => state.normalisedFields.get(field) === "Administration ID",
  );

  const hasDosingRows = amountField !== undefined;
  const hasInvalidUnits =
    hasDosingRows &&
    state.data
      .map((row) => row[amountUnitField])
      .some((symbol) => !units?.find((unit) => unit.symbol === symbol));
  if (
    hasInvalidUnits &&
    amountUnitField !== "Amount Unit" &&
    state.normalisedFields.get(amountUnitField) !== "Ignore"
  ) {
    const newNormalisedFields = new Map(state.normalisedFields);
    newNormalisedFields.set(amountUnitField, "Ignore");
    newNormalisedFields.set("Amount Unit", "Amount Unit");
    state.setNormalisedFields(newNormalisedFields);
  }

  const dosingCompartments = projectProtocols?.map((protocol) => {
    return (
      protocol.mapped_qname ||
      variables?.find((variable) => variable.id === protocol.variables[0])
        ?.qname ||
      ""
    );
  });

  return hasDosingRows ? (
    <DosingProtocols
      administrationIdField={administrationIdField || "Administration ID"}
      amountUnitField={amountUnitField}
      amountUnit={amountUnit}
      state={state}
      units={units || []}
      variables={variables || []}
      notificationsInfo={notificationsInfo}
    />
  ) : (
    <CreateDosingProtocols
      administrationIdField={administrationIdField || "Administration ID"}
      amountUnitField={amountUnitField || ""}
      amountUnit={amountUnit}
      dosingCompartments={dosingCompartments}
      state={state}
      units={units || []}
      variables={variables || []}
      notificationsInfo={notificationsInfo}
    />
  );
};

export default MapDosing;
