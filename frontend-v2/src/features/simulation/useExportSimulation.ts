import useProtocols from "./useProtocols";
import useSubjectGroups from "../../hooks/useSubjectGroups";
import {
  CombinedModelRead,
  Simulate,
  useCombinedModelSimulateCreateMutation,
  useUnitListQuery,
  useVariableListQuery,
  ProjectRead,
  SimulateResponse,
} from "../../app/backendApi";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { SerializedError } from "@reduxjs/toolkit";

interface iExportSimulation {
  simInputs: Simulate;
  model: CombinedModelRead | undefined;
  project: ProjectRead | undefined;
}

const parseResponse = (
  data: SimulateResponse,
  timeCol: number,
  label: string,
) => {
  const cols = Object.keys(data.outputs);
  const nrows = data.outputs[Object.keys(data.outputs)[0]].length;
  const ncols = cols.length;
  // move time to first column
  if (timeCol !== -1) {
    const timeId = cols[timeCol];
    cols[timeCol] = cols[0];
    cols[0] = timeId;
  }
  const rows = new Array(nrows);
  let rowi = 0;
  for (let i = 0; i < nrows; i++) {
    rows[rowi] = new Array(ncols);
    for (let j = 0; j < ncols; j++) {
      rows[rowi][j] = data.outputs[cols[j]][i];
    }
    rows[rowi].push(label);
    rowi++;
  }
  return rows;
};

export default function useExportSimulation({
  simInputs,
  model,
  project,
}: iExportSimulation): [
    () => void,
    { error: FetchBaseQueryError | SerializedError | undefined },
  ] {
  const { groups } = useSubjectGroups();
  const { compound, protocols } = useProtocols();
  const { data: variables } = useVariableListQuery(
    { dosedPkModelId: model?.id || 0 },
    { skip: !model?.id },
  );
  const { data: units } = useUnitListQuery(
    { compoundId: project?.compound || 0 },
    { skip: !project?.compound },
  );
  const [simulate, { error: simulateErrorBase }] =
    useCombinedModelSimulateCreateMutation();
  const exportSimulation = () => {
    if (
      simInputs.variables &&
      simInputs.outputs &&
      simInputs.time_max &&
      variables &&
      units &&
      model &&
      protocols &&
      compound &&
      project &&
      groups
    ) {
      console.log("Export to CSV: simulating with params", simInputs.variables);
      simulate({
        id: model.id,
        simulate: simInputs,
      }).then((response) => {
        let rows = Object.keys(simInputs.variables).map((key) => {
          const variable = variables.find((v) => v.qname === key);
          const unit = units.find((u) => u.id === variable?.unit);
          return [
            `${key} (${unit?.symbol || ""})`,
            simInputs.variables[key],
            ,
          ];
        });
        if (response?.data) {
          const cols = Object.keys(response.data[0].outputs);
          const vars = cols.map((vid) =>
            variables.find((v) => v.id === parseInt(vid)),
          );
          const varUnits = vars.map((v) => units.find((u) => u.id === v?.unit));
          const varNames = vars.map(
            (v, i) => `${v?.qname} (${varUnits[i]?.symbol || ""})`,
          );
          const timeCol = varNames.findIndex((n) =>
            n.startsWith("environment.t"),
          );
          // move time to first column
          if (timeCol !== -1) {
            const timeName = varNames[timeCol];
            varNames[timeCol] = varNames[0];
            varNames[0] = timeName.replace("environment.t", "time");
          }
          rows = [
            ...rows,
            [...varNames, "Group"],
            ...response.data.flatMap((data, index) => {
              const label =
                index === 0
                  ? "Project"
                  : groups[index - 1].id_in_dataset || groups[index - 1].name;
              return parseResponse(data, timeCol, label);
            }),
          ];
        }
        const csvContent = rows.map((e) => e.join(",")).join("\n");
        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `${project.name}.csv`;
        link.href = url;
        link.click();
      });
    }
  };

  return [exportSimulation, { error: simulateErrorBase }];
}
