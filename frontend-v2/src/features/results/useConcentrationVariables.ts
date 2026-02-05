import { useContext } from "react";
import { useSelector } from "react-redux";

import { SimulationContext } from "../../contexts/SimulationContext";
import { RootState } from "../../app/store";
import { useCombinedModelListQuery } from "../../app/backendApi";
import { useVariables } from "./useVariables";
import { renameVariable } from "../simulation/utils";

export function useConcentrationVariables() {
  const { simulations } = useContext(SimulationContext);
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;
  const { data: models } = useCombinedModelListQuery(
    { projectId: projectIdOrZero },
    { skip: !projectId },
  );
  const model = models?.[0];
  const variables = useVariables();
  const simulationVariableIDs = simulations?.[0]?.outputs
    ? Object.keys(simulations[0].outputs).map((key) => parseInt(key))
    : [];
  return (
    variables
      ?.filter(
        (variable) =>
          simulationVariableIDs.includes(variable.id) &&
          model?.derived_variables?.find(
            (dv) => dv.pk_variable === variable.id && dv.type === "AUC",
          ),
      )
      .map((v) => renameVariable(v, model)) || []
  );
}
