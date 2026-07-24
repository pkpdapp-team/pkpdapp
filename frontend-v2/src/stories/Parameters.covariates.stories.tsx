import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within, waitFor } from "storybook/test";
import { useForm, useWatch } from "react-hook-form";
import { http, HttpResponse } from "msw";
import { Table, TableBody } from "@mui/material";

import ParameterRow from "../features/model/parameters/ParameterRow";
import { ModelFormData } from "../features/model/modelFormState";
import {
  CombinedModelRead,
  CovariateRead,
  DerivedVariableRead,
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

// a single PK parameter so the Covariates select is the only multi-select we
// need to drive (its nonlinearity select sits before it in the same row)
const clVariable = makeVariable({
  id: 1001,
  name: "CL",
  qname: "PKCompartment.CL",
  default_value: 5,
});
const storyVariables: VariableRead[] = [clVariable];

// custom covariates returned by the covariate list endpoint (none exist as
// shared fixtures, so define them inline)
const albumin: CovariateRead = {
  id: 5,
  name: "albumin",
  type: "CONT",
  project: project.id,
};
const ethnicity: CovariateRead = {
  id: 6,
  name: "ethnicity",
  type: "CAT",
  n_categories: 3,
  project: project.id,
};

const variableHandlers = [
  http.get("/api/variable/:id/", ({ params }) => {
    const id = Number(params.id);
    const variable = storyVariables.find((v) => v.id === id);
    return variable
      ? HttpResponse.json(variable, { status: 200 })
      : HttpResponse.json({ error: "Variable not found" }, { status: 404 });
  }),
  http.put("/api/variable/:id/", async ({ params, request }) => {
    const id = Number(params.id);
    const body = (await request.json()) as VariableRead;
    return HttpResponse.json({ ...body, id }, { status: 200 });
  }),
];

const covariateHandler = (list: CovariateRead[]) =>
  http.get("/api/covariate/", async ({ request }) => {
    const projectId = new URL(request.url).searchParams.get("project_id");
    const filtered = projectId
      ? list.filter((c) => c.project === parseInt(projectId, 10))
      : list;
    return HttpResponse.json(filtered, { status: 200 });
  });

const Harness = ({
  initialDerived = [],
}: {
  initialDerived?: Partial<DerivedVariableRead>[];
}) => {
  const { control } = useForm<ModelFormData>({
    defaultValues: {
      derived_variables: initialDerived,
    } as unknown as ModelFormData,
  });
  const derived = useWatch({ control, name: "derived_variables" }) ?? [];
  return (
    <>
      <div data-testid="derived-vars">{JSON.stringify(derived)}</div>
      <Table>
        <TableBody>
          {storyVariables.map((variable) => (
            <ParameterRow
              key={variable.id}
              model={model}
              project={project}
              variable_from_list={variable}
              variables={storyVariables}
              units={[]}
              modelControl={control}
            />
          ))}
        </TableBody>
      </Table>
    </>
  );
};

const meta: Meta<typeof ParameterRow> = {
  title: "Model/Parameters Covariates",
  component: ParameterRow,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: [...variableHandlers, covariateHandler([])],
    },
  },
  render: () => <Harness />,
};

export default meta;
type Story = StoryObj<typeof meta>;

// Open the Covariates multi-select (the last combobox in the CL row).
async function openCovariateSelect(
  canvasElement: HTMLElement,
  userEvent: { click: (el: Element) => Promise<void> },
) {
  const canvas = within(canvasElement);
  const clRow = (await canvas.findByText("CL")).closest("tr") as HTMLElement;
  const comboboxes = within(clRow).getAllByRole("combobox");
  const covariateSelect = comboboxes[comboboxes.length - 1];
  await userEvent.click(covariateSelect);
  return covariateSelect;
}

function derivedVars(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  return JSON.parse(canvas.getByTestId("derived-vars").textContent || "[]");
}

export const AddBuiltinCovariates: Story = {
  play: async ({ canvasElement, userEvent }) => {
    await openCovariateSelect(canvasElement, userEvent);
    const body = within(document.body);

    await userEvent.click(await body.findByRole("option", { name: "Weight" }));
    await waitFor(() =>
      expect(derivedVars(canvasElement)).toEqual([
        expect.objectContaining({
          type: "WTC",
          pk_variable: 1001,
          pkpd_model: 1,
        }),
      ]),
    );

    await userEvent.click(await body.findByRole("option", { name: "Age" }));
    await waitFor(() => {
      const types = derivedVars(canvasElement).map(
        (d: DerivedVariableRead) => d.type,
      );
      expect(types).toEqual(expect.arrayContaining(["WTC", "AGC"]));
    });
  },
};

export const RemoveCovariate: Story = {
  render: () => (
    <Harness
      initialDerived={[
        { pk_variable: 1001, pkpd_model: 1, type: "WTC" },
        { pk_variable: 1001, pkpd_model: 1, type: "AGC" },
      ]}
    />
  ),
  play: async ({ canvasElement, userEvent }) => {
    // starts with Weight + Age selected
    expect(
      derivedVars(canvasElement).map((d: DerivedVariableRead) => d.type),
    ).toEqual(["WTC", "AGC"]);

    await openCovariateSelect(canvasElement, userEvent);
    const body = within(document.body);
    // deselect Weight
    await userEvent.click(await body.findByRole("option", { name: "Weight" }));
    await waitFor(() =>
      expect(
        derivedVars(canvasElement).map((d: DerivedVariableRead) => d.type),
      ).toEqual(["AGC"]),
    );
  },
};

export const AddCustomCovariates: Story = {
  parameters: {
    msw: {
      handlers: [...variableHandlers, covariateHandler([albumin, ethnicity])],
    },
  },
  play: async ({ canvasElement, userEvent }) => {
    await openCovariateSelect(canvasElement, userEvent);
    const body = within(document.body);

    // continuous custom covariate -> CCC with its id
    await userEvent.click(await body.findByRole("option", { name: "albumin" }));
    await waitFor(() =>
      expect(derivedVars(canvasElement)).toEqual([
        expect.objectContaining({ type: "CCC", covariate: 5 }),
      ]),
    );

    // categorical custom covariate -> CCT with its id
    await userEvent.click(
      await body.findByRole("option", { name: "ethnicity" }),
    );
    await waitFor(() =>
      expect(derivedVars(canvasElement)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "CCC", covariate: 5 }),
          expect.objectContaining({ type: "CCT", covariate: 6 }),
        ]),
      ),
    );
  },
};

export const ReflectsExistingSelection: Story = {
  render: () => (
    <Harness
      initialDerived={[{ pk_variable: 1001, pkpd_model: 1, type: "WTC" }]}
    />
  ),
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    // the select renders the label of the already-selected covariate
    expect(await canvas.findByText("Weight")).toBeInTheDocument();
    // and opening it shows Weight ticked
    await openCovariateSelect(canvasElement, userEvent);
    const weightOption = await within(document.body).findByRole("option", {
      name: "Weight",
    });
    expect(within(weightOption).getByRole("checkbox")).toBeChecked();
  },
};
