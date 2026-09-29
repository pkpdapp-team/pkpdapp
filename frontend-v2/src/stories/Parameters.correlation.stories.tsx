import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within, waitFor } from "storybook/test";
import { http, HttpResponse } from "msw";

import CorrelationMatrix from "../features/model/parameters/CorrelationMatrix";
import {
  CombinedModelRead,
  CorrelationRead,
  ProjectRead,
  VariableRead,
} from "../app/backendApi";

const model = {
  id: 1,
  is_library_model: false,
  number_of_effect_compartments: 0,
} as CombinedModelRead;

const project = { id: 1, user_access: [] } as unknown as ProjectRead;

const makeVariable = (over: Partial<VariableRead>): VariableRead => ({
  id: 0,
  protocols: [],
  name: "",
  qname: "",
  constant: true,
  lower_bound: null,
  upper_bound: null,
  default_value: 1,
  distribution: null,
  unit: null,
  dosed_pk_model: model.id,
  ...over,
});

// Two population parameters, each with a saved distribution (with an id), so the
// correlation matrix has a single editable upper-triangle cell.
const storyVariables: VariableRead[] = [
  makeVariable({
    id: 1001,
    name: "CL",
    qname: "PKCompartment.CL",
    default_value: 5,
    distribution: { id: 11, pdf: "lognormal", variance: 0.09 },
  }),
  makeVariable({
    id: 1002,
    name: "V",
    qname: "PKCompartment.V",
    default_value: 10,
    distribution: { id: 12, pdf: "lognormal", variance: 0.09 },
  }),
];

// Shared mock backend state for the correlation endpoints.
let correlations: CorrelationRead[] = [];
let nextId = 100;
let lastCoefficientPosted: number | null = null;
let lastDeletedId: number | null = null;

const meta: Meta<typeof CorrelationMatrix> = {
  title: "Model/Parameters Correlation",
  component: CorrelationMatrix,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: [
        http.get("/api/correlation/", () =>
          HttpResponse.json(correlations, { status: 200 }),
        ),
        http.post("/api/correlation/", async ({ request }) => {
          const body = (await request.json()) as CorrelationRead;
          lastCoefficientPosted = body.coefficient ?? null;
          const created = { ...body, id: nextId++ };
          correlations = [...correlations, created];
          return HttpResponse.json(created, { status: 201 });
        }),
        http.put("/api/correlation/:id/", async ({ params, request }) => {
          const id = Number(params.id);
          const body = (await request.json()) as CorrelationRead;
          correlations = correlations.map((c) =>
            c.id === id ? { ...c, ...body } : c,
          );
          return HttpResponse.json({ ...body, id }, { status: 200 });
        }),
        http.delete("/api/correlation/:id/", ({ params }) => {
          const id = Number(params.id);
          lastDeletedId = id;
          correlations = correlations.filter((c) => c.id !== id);
          return new HttpResponse(null, { status: 204 });
        }),
      ],
    },
  },
  render: () => (
    <CorrelationMatrix
      model={model}
      project={project}
      variables={storyVariables}
    />
  ),
};

export default meta;
type Story = StoryObj<typeof meta>;

// Validation and creation: an empty cell rejects out-of-range and zero values,
// and a valid value creates the correlation.
export const CorrelationValidation: Story = {
  play: async ({ canvasElement, userEvent }) => {
    // Reset shared mock state between reruns.
    correlations = [];
    nextId = 100;
    lastCoefficientPosted = null;
    lastDeletedId = null;

    const canvas = within(canvasElement);

    // The matrix header and the single upper-triangle coefficient field render.
    await canvas.findByText("Population Correlation Matrix");
    const field = await canvas.findByRole("spinbutton");

    // A value outside [-1, 1] is rejected with an error message and no request.
    await userEvent.type(field, "2");
    await userEvent.tab();
    await canvas.findByText("Enter a value between -1 and 1");
    expect(lastCoefficientPosted).toBeNull();

    // 0 is also rejected: the user must clear the field to turn correlation off.
    await userEvent.clear(field);
    await userEvent.type(field, "0");
    await userEvent.tab();
    await canvas.findByText("Use the clear (×) button to remove a correlation");
    expect(lastCoefficientPosted).toBeNull();

    // Typing a valid coefficient into the cell creates the correlation.
    await userEvent.clear(field);
    await userEvent.type(field, "0.5");
    await userEvent.tab();
    await waitFor(() => expect(lastCoefficientPosted).toBe(0.5));
  },
};

// Clearing: a cell with an existing correlation shows the coefficient and the
// clear (cross) button removes it.
export const CorrelationClear: Story = {
  play: async ({ canvasElement, userEvent }) => {
    // Start with a saved correlation so it is loaded into the cell up front.
    correlations = [
      { id: 55, distribution_1: 11, distribution_2: 12, coefficient: 0.5 },
    ];
    nextId = 100;
    lastCoefficientPosted = null;
    lastDeletedId = null;

    const canvas = within(canvasElement);

    // The existing coefficient is shown in the cell.
    await canvas.findByDisplayValue("0.5");

    // The clear (cross) button removes the correlation.
    const clearButton = await canvas.findByRole("button", {
      name: "Clear correlation",
    });
    await userEvent.click(clearButton);
    await waitFor(() => expect(lastDeletedId).toBe(55));
  },
};
