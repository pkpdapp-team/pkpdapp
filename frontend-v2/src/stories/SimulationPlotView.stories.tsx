import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { useMemo } from "react";
import { useForm } from "react-hook-form";

import SimulationPlotView from "../features/simulation/SimulationPlotView";
import {
  CombinedModelRead,
  CompoundRead,
  SimulateResponse,
  SimulateUncertaintyResponse,
  Simulation,
  UnitRead,
  VariableRead,
} from "../app/backendApi";
import { simulationData } from "./simulations.mock";

const baseSimulation = simulationData[0] as SimulateResponse;
const outputIds = Object.keys(baseSimulation.outputs);
const outputId = Number(outputIds[0]);
const outputSeries = baseSimulation.outputs[String(outputId)] || [];

const uncertaintyData: SimulateUncertaintyResponse[] = [
  {
    time: baseSimulation.time,
    group: baseSimulation.group ?? null,
    sample_count: 200,
    outputs: {
      [String(outputId)]: {
        mean: outputSeries,
        std: outputSeries.map((value) => Math.max(Math.abs(value) * 0.1, 0.01)),
        quantiles: {
          "0.05": outputSeries.map((value) => Math.max(value * 0.8, 0)),
          "0.95": outputSeries.map((value) => value * 1.2),
        },
      },
    },
  },
];

const units: UnitRead[] = [
  {
    id: 1,
    symbol: "pmol/L",
    compatible_units: [
      {
        id: "1",
        symbol: "pmol/L",
        conversion_factor: "1.0",
        target_conversion_factor: "1.0",
        target2_conversion_factor: "1.0",
      },
    ],
    g: 0,
    m: -3,
    s: 0,
    A: 0,
    K: 0,
    cd: 0,
    mol: 1,
    multiplier: -12,
  },
  {
    id: 2,
    symbol: "h",
    compatible_units: [
      {
        id: "2",
        symbol: "h",
        conversion_factor: "1.0",
        target_conversion_factor: "1.0",
        target2_conversion_factor: "1.0",
      },
    ],
    g: 0,
    m: 0,
    s: 1,
    A: 0,
    K: 0,
    cd: 0,
    mol: 0,
    multiplier: 0,
  },
];

const variables: VariableRead[] = [
  {
    id: 10,
    protocols: [],
    read_only: false,
    datetime: null,
    is_public: false,
    lower_bound: null,
    upper_bound: null,
    default_value: 0,
    lower_threshold: null,
    upper_threshold: null,
    is_log: false,
    name: "t",
    description: "",
    binding: "time",
    qname: "environment.t",
    unit_per_body_weight: false,
    unit_symbol: null,
    constant: false,
    state: false,
    color: 0,
    display: true,
    axis: false,
    secondary_unit: null,
    unit: 2,
    pd_model: null,
    pk_model: null,
    dosed_pk_model: null,
  },
  {
    id: outputId,
    protocols: [],
    read_only: false,
    datetime: null,
    is_public: false,
    lower_bound: null,
    upper_bound: null,
    default_value: 0,
    lower_threshold: null,
    upper_threshold: null,
    is_log: false,
    name: "C1",
    description: "Central concentration",
    binding: null,
    qname: "PKCompartment.C1",
    unit_per_body_weight: false,
    unit_symbol: null,
    constant: false,
    state: false,
    color: 1,
    display: true,
    axis: false,
    secondary_unit: null,
    unit: 1,
    pd_model: null,
    pk_model: null,
    dosed_pk_model: null,
  },
];

const plot = {
  id: "plot-1",
  index: 0,
  y_axes: [{ variable: outputId, right: false }],
  cx_lines: [],
  x_scale: "lin",
  y_scale: "lin",
  y2_scale: "lin",
  x_unit: 2,
  y_unit: 1,
  y_unit2: null,
  min: null,
  max: null,
  min2: null,
  max2: null,
} as unknown as Simulation["plots"][number] & { id: string };

const model = {
  is_library_model: true,
  number_of_effect_compartments: 0,
} as CombinedModelRead;

const compound = {
  use_efficacy: null,
} as CompoundRead;

const PlotHarness = () => {
  const { control, setValue } = useForm<Simulation>({
    defaultValues: {
      name: "Uncertainty simulation",
      sliders: [],
      plots: [],
      project: 1,
      time_max_unit: 2,
    },
  });

  const data = useMemo(() => [baseSimulation], []);

  return (
    <div style={{ height: 520, width: 900 }}>
      <SimulationPlotView
        index={0}
        plot={plot}
        data={data}
        uncertaintyData={uncertaintyData}
        dataReference={[]}
        uncertaintyReferenceData={[]}
        variables={variables}
        control={control}
        setValue={setValue}
        remove={() => {}}
        units={units}
        compound={compound}
        model={model}
        visibleGroups={["Sim-Group 1"]}
        shouldShowLegend={true}
        isVertical={false}
        isHorizontal={false}
        dimensions={{ width: 900, height: 520 }}
        plotCount={1}
      />
    </div>
  );
};

const meta: Meta<typeof SimulationPlotView> = {
  title: "Simulations/Plot/Uncertainty",
  component: SimulationPlotView,
  parameters: {
    layout: "fullscreen",
  },
  render: () => <PlotHarness />,
};

export default meta;

type Story = StoryObj<typeof SimulationPlotView>;

export const WithUncertaintyBands: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const plotlyRoot = await canvas
      .findByTestId("plotly-root", {}, { timeout: 5000 })
      .catch(() => null);

    if (plotlyRoot) {
      expect(plotlyRoot).toBeInTheDocument();
      return;
    }

    const graph = canvasElement.querySelector(".js-plotly-plot");
    expect(graph).toBeInTheDocument();
  },
};
