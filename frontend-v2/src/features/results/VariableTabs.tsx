import { SyntheticEvent, FC, useContext, useState } from "react";
import { useSelector } from "react-redux";

import { SimulationContext } from "../../contexts/SimulationContext";
import { RootState } from "../../app/store";
import {
  useCombinedModelListQuery,
  useVariableListQuery,
} from "../../app/backendApi";
import { Box, Tab, Tabs, Typography } from "@mui/material";
import VariableTable from "./VariableTable";

interface VariableTabsProps {
  index: number;
}

const VariableTabs: FC<VariableTabsProps> = ({ index }) => {
  const [tab, setTab] = useState(0);
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;
  const { data: models } = useCombinedModelListQuery(
    { projectId: projectIdOrZero },
    { skip: !projectId },
  );
  const model = models?.[0] || null;
  const { data: variables } = useVariableListQuery(
    { dosedPkModelId: model?.id || 0 },
    { skip: !model?.id },
  );

  const { simulations, thresholds } = useContext(SimulationContext);
  const simulationVariableIDs = simulations?.[0]?.outputs
    ? Object.keys(simulations[0].outputs).map((key) => parseInt(key))
    : [];
  const concentrationVariables =
    variables?.filter(
      (variable) =>
        simulationVariableIDs.includes(variable.id) &&
        model?.derived_variables?.find(
          (dv) => dv.pk_variable === variable.id && dv.type === "AUC",
        ),
    ) || [];

  function variableValues(name: string) {
    const variable = variables?.find((v) => v.name === name);
    return variable
      ? simulations.map((simulation) => simulation.outputs[variable.id])
      : [];
  }

  function handleTabChange(
    event: SyntheticEvent<Element, Event>,
    newValue: number,
  ) {
    setTab(newValue);
  }
  const simulation = simulations[index];
  const variable = concentrationVariables[tab];
  const aucVariable = variable && `calc_${variable.name}_AUC`;
  const values = variableValues(variable?.name)[index];
  const aucValues = variableValues(aucVariable)[index];

  try {
    return (
      <>
        <Tabs value={tab} onChange={handleTabChange}>
          {concentrationVariables?.map((cVar, index) => {
            return (
              <Tab
                key={cVar.id}
                label={cVar.name}
                id={`cvar-tab-${index}`}
                aria-controls="cvar-tabpanel"
              />
            );
          })}
        </Tabs>
        <Box id="cvar-tabpanel">
          <Typography>
            Threshold: {thresholds[concentrationVariables[tab].name]}
          </Typography>
          <VariableTable
            key={variable.id}
            variable={variable}
            values={values}
            aucValues={aucValues}
            times={simulation.time}
          />
        </Box>
      </>
    );
  } catch (e: any) {
    console.error(e);
    return <div>Error {e.message}</div>;
  }
};

export default VariableTabs;
