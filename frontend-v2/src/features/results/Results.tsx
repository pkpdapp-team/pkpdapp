import { ChangeEvent, FC, useContext, useState } from "react";
import { useSelector } from "react-redux";

import { SimulationContext } from "../../contexts/SimulationContext";
import { RootState } from "../../app/store";
import {
  useCombinedModelListQuery,
  useProjectRetrieveQuery,
  useUnitListQuery,
  useVariableListQuery,
} from "../../app/backendApi";
import { Box, Tab, Tabs, Typography } from "@mui/material";
import useSubjectGroups from "../../hooks/useSubjectGroups";
import VariableTable from "./VariableTable";

const thresholds: { [key: string]: number } = {
  C1: 1e4,
  C1_t: 5e4,
  CT1_f: 200,
  CT1_b: 900,
};

const Results: FC = () => {
  const [tab, setTab] = useState(0);
  const [varTab, setVarTab] = useState(0);
  const projectId = useSelector(
    (state: RootState) => state.main.selectedProject,
  );
  const projectIdOrZero = projectId || 0;
  const { data: project } = useProjectRetrieveQuery(
    { id: projectIdOrZero },
    { skip: !projectId },
  );
  const { data: models } = useCombinedModelListQuery(
    { projectId: projectIdOrZero },
    { skip: !projectId },
  );
  const model = models?.[0] || null;
  const { data: variables } = useVariableListQuery(
    { dosedPkModelId: model?.id || 0 },
    { skip: !model?.id },
  );
  const { data: units } = useUnitListQuery(
    { compoundId: project?.compound },
    { skip: !project || !project.compound },
  );

  const { simulations } = useContext(SimulationContext);
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
  const { groups = [] } = useSubjectGroups();

  function variableValues(name: string) {
    const variable = variables?.find((v) => v.name === name);
    return variable
      ? simulations.map((simulation) => simulation.outputs[variable.id])
      : [];
  }
  const groupNames = ["Project", ...groups.map((group) => group.name)];

  function handleTabChange(event: ChangeEvent<{}>, newValue: number) {
    setTab(newValue);
  }
  function handleVarTabChange(event: ChangeEvent<{}>, newValue: number) {
    setVarTab(newValue);
  }
  const simulation = simulations[tab];
  const variable = concentrationVariables[varTab];
  const aucVariable = variable && `calc_${variable.name}_AUC`;
  const values = variableValues(variable?.name)[tab];
  const aucValues = variableValues(aucVariable)[tab];

  try {
    return (
      <>
        <Tabs value={tab} onChange={handleTabChange}>
          <Tab
            label={"Project"}
            id="group-tab-0"
            aria-controls="group-tabpanel"
          />
          {groups?.map((group, index) => {
            return (
              <Tab
                key={group.id}
                label={group.name}
                id={`group-tab-${index + 1}`}
                aria-controls="group-tabpanel"
              />
            );
          })}
        </Tabs>
        <Box id="group-tabpanel">
          <Tabs value={varTab} onChange={handleVarTabChange}>
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
              Threshold: {thresholds[concentrationVariables[varTab].name]}
            </Typography>
            <VariableTable
              key={variable.id}
              variable={variable}
              values={values}
              aucValues={aucValues}
              times={simulation.time}
            />
          </Box>
        </Box>
      </>
    );
  } catch (e: any) {
    console.error(e);
    return <div>Error {e.message}</div>;
  }
};

export default Results;
