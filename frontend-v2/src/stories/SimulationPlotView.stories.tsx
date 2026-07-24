import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { http, HttpResponse } from "msw";

import SimulationPlotView from "../features/simulation/SimulationPlotView";
import {
  CombinedModelRead,
  CompoundRead,
  SimulateResponse,
  Simulation,
  UnitRead,
  VariableRead,
} from "../app/backendApi";
import { CentralSimulateResponse } from "../features/simulation/types";
import { simulationData } from "./simulations.mock";
import { combinedModels, project, protocols, subjectGroups } from "./generated-mocks";
import { computeCompatibleUnits } from "../shared/unitConversion";

const baseSimulation = simulationData[0] as CentralSimulateResponse;
const outputIds = Object.keys(baseSimulation.outputs);
const outputId = Number(outputIds[0]);
const outputSeries = baseSimulation.outputs[String(outputId)] || [];

// tie the mocked results to a real subject group (id 1, "Group 1") now that the
// base group is a real SubjectGroup and results are matched by group id.
const GROUP_ID = 1;

const uncertaintyData: SimulateResponse[] = [
  {
    time: baseSimulation.time,
    group: GROUP_ID,
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

const baseUnits: UnitRead[] = [
  {
    id: 1,
    symbol: "pmol/L",
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

// A constant parameter (with a distribution) whose sampled values are plotted as
// a histogram. Its id keys the `parameters` map on the simulate response.
const paramId = 20;
const paramVariable: VariableRead = {
  ...variables[1],
  id: paramId,
  name: "CL",
  description: "Clearance",
  qname: "PKCompartment.CL",
  constant: true,
  distribution: { id: 1, pdf: "lognormal", variance: 0.09 },
};

// a deterministic lognormal-ish spread of 200 sampled values
const paramSamples = Array.from(
  { length: 200 },
  (_, i) => 5 * Math.exp(0.3 * Math.sin(i)),
);

const histogramUncertaintyData: SimulateResponse[] = [
  {
    time: baseSimulation.time,
    group: GROUP_ID,
    sample_count: 200,
    outputs: {},
    parameters: { [String(paramId)]: paramSamples },
  },
];

const histogramPlot = {
  id: "plot-hist",
  index: 0,
  y_axes: [{ variable: paramId, right: false }],
  cx_lines: [],
  x_scale: "lin",
  y_scale: "lin",
  y2_scale: "lin",
  x_unit: 1,
  y_unit: null,
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

const units = computeCompatibleUnits(baseUnits, compound);

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

  const data = useMemo(() => [{ ...baseSimulation, group: GROUP_ID }], []);

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
        visibleGroups={["Group 1"]}
        shouldShowLegend={true}
        isVertical={false}
        isHorizontal={false}
        dimensions={{ width: 900, height: 520 }}
        plotCount={1}
      />
    </div>
  );
};

const HistogramHarness = () => {
  const { control, setValue } = useForm<Simulation>({
    defaultValues: {
      name: "Histogram simulation",
      sliders: [],
      plots: [],
      project: 1,
      time_max_unit: 2,
    },
  });

  const data = useMemo(() => [{ ...baseSimulation, group: GROUP_ID }], []);

  return (
    <div style={{ height: 520, width: 900 }}>
      <SimulationPlotView
        index={0}
        plot={histogramPlot}
        data={data}
        uncertaintyData={histogramUncertaintyData}
        dataReference={[]}
        uncertaintyReferenceData={[]}
        variables={[...variables, paramVariable]}
        control={control}
        setValue={setValue}
        remove={() => {}}
        units={units}
        compound={compound}
        model={model}
        visibleGroups={["Group 1"]}
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
    msw: {
      handlers: [
        http.get("/api/protocol/", () => {
          return HttpResponse.json(protocols, { status: 200 });
        }),
        http.get("/api/subject_group/", () => {
          return HttpResponse.json(subjectGroups, { status: 200 });
        }),
        http.get("/api/project/:id/", ({ params }) => {
          if (Number(params.id) === project.id) {
            return HttpResponse.json(project, { status: 200 });
          }
          return HttpResponse.json(null, { status: 404 });
        }),
        http.get("/api/combined_model/", () => {
          return HttpResponse.json(combinedModels, { status: 200 });
        }),
      ],
    },
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

export const Histogram: Story = {
  render: () => <HistogramHarness />,
  play: async ({ canvasElement }) => {
    // the plot renders, and a histogram trace (plotly bar layer) is drawn
    await within(canvasElement)
      .findByTestId("plotly-root", {}, { timeout: 5000 })
      .catch(() => null);
    const gd = canvasElement.querySelector(
      ".js-plotly-plot",
    ) as (HTMLElement & { data?: { type?: string }[] }) | null;
    expect(gd).toBeInTheDocument();
    // the trace passed to plotly is a (binned) bar histogram of the samples
    expect(gd?.data?.[0]?.type).toBe("bar");
    // plotly draws histogram/bar traces into the bar layer as <path> points
    await waitFor(
      () => {
        const bars = canvasElement.querySelectorAll(
          ".barlayer .point, .trace.bars .point",
        );
        expect(bars.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );
  },
};
