import { getSimulateInput, getVariablesSimulated } from "./useSimulation";
import {
  CompoundRead,
  CombinedModelRead,
  ProtocolListApiResponse,
  SimulationRead,
  useCombinedModelSimulateCreateMutation,
  useUnitListQuery,
  useVariableListQuery,
  ProjectRead,
  VariableListApiResponse,
  UnitListApiResponse
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
}

const parseResponse = (
  data: any,
  variables: VariableListApiResponse,
  units: UnitListApiResponse
) => {
  const nrows =
    data.outputs[Object.keys(data.outputs)[0]].length;
  const cols = Object.keys(data.outputs);
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
    const timeId = cols[timeCol];
    cols[timeCol] = cols[0];
    cols[0] = timeId;
  }
  const ncols = cols.length;
  const rows = new Array(nrows + 1);
  let rowi = 0;
  rows[rowi] = varNames;
  rowi++;
  for (let i = 0; i < nrows; i++) {
    rows[rowi] = new Array(ncols);
    for (let j = 0; j < ncols; j++) {
      rows[rowi][j] = data.outputs[cols[j]][i];
    }
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
      project
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
          rows = [
            ...rows,
            ...response.data.flatMap(data => parseResponse(data, variables, units))
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