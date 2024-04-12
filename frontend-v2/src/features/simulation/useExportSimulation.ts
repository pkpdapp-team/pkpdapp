import { getSimulateInput, getVariablesSimulated } from "./useSimulation";
import {
  CompoundRead,
  CombinedModelRead,
  ProtocolListApiResponse,
  SimulationRead,
  useCombinedModelSimulateCreateMutation,
  useUnitListQuery,
  useVariableListQuery,
  ProjectRead
} from "../../app/backendApi";

type SliderValues = { [key: number]: number };

interface iExportSimulation {
  simulation: SimulationRead | undefined;
  sliderValues: SliderValues | undefined;
  model: CombinedModelRead | undefined;
  protocols: ProtocolListApiResponse | undefined;
  compound: CompoundRead | undefined;
  timeMax: number | undefined;
  project: ProjectRead | undefined;
  groups: { id: number; name: string }[];
}

const parseResponse = (
  data: any,
  timeCol: number,
  label: string,
) => {
  const cols = Object.keys(data.outputs);
  const nrows =
    data.outputs[Object.keys(data.outputs)[0]].length;
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
}

export default function useExportSimulation({
  simulation,
  sliderValues,
  model,
  protocols,
  compound,
  timeMax,
  project,
  groups
}: iExportSimulation): [() => void, { error: any }] {
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
      simulation &&
      variables &&
      units &&
      model &&
      protocols &&
      compound &&
      sliderValues &&
      project &&
      groups
    ) {

      const allParams = getVariablesSimulated(variables, sliderValues);
      console.log("Export to CSV: simulating with params", allParams);
      simulate({
        id: model.id,
        simulate: getSimulateInput(
          simulation,
          sliderValues,
          variables,
          timeMax,
          true,
        ),
      }).then((response) => {
        let rows = allParams.map((p) => [p.qname, p.value]);
        if ("data" in response) {
          const cols = Object.keys(response.data[0].outputs);
          const vars = cols.map((vid) =>
            variables.find((v) => v.id === parseInt(vid)),
          );
          const varUnits = vars.map((v) =>
            units.find((u) => u.id === v?.unit)
          );
          const varNames = vars.map((v, i) => `${v?.qname} (${varUnits[i]?.symbol || ''})`);
          const timeCol = varNames.findIndex(n => n.startsWith("environment.t"));
          // move time to first column
          if (timeCol !== -1) {
            const timeName = varNames[timeCol];
            varNames[timeCol] = varNames[0];
            varNames[0] = timeName.replace("environment.t", "time");
          }
          rows = [
            ...rows,
            [...varNames, 'Group'],
            ...response.data.flatMap((data, index) => {
              const label = index === 0 ? 'Project' : groups[index - 1].name;
              return parseResponse(data, timeCol, label)
            })
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