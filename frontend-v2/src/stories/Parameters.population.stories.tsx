import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within, waitFor } from "storybook/test";
import { useForm } from "react-hook-form";
import { http, HttpResponse } from "msw";
import { Table, TableBody } from "@mui/material";

import ParameterRow from "../features/model/parameters/ParameterRow";
import { ModelFormData } from "../features/model/modelFormState";
import {
  CombinedModelRead,
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

// One unbounded parameter (defaults to log-normal) and one bounded to [0, 1]
// (defaults to logit-normal).
const storyVariables: VariableRead[] = [
  makeVariable({
    id: 1001,
    name: "CL",
    qname: "PKCompartment.CL",
    default_value: 5,
  }),
  makeVariable({
    id: 1002,
    name: "Imax",
    qname: "PDCompartment.Imax",
    lower_bound: 0,
    upper_bound: 1,
    default_value: 0.5,
  }),
];

// The last variable PUT body seen by the mock backend, for assertions.
let lastVariablePut: VariableRead | null = null;

const Harness = () => {
  const { control } = useForm<ModelFormData>({
    defaultValues: { derived_variables: [] } as unknown as ModelFormData,
  });
  return (
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
  );
};

const meta: Meta<typeof ParameterRow> = {
  title: "Model/Parameters Population",
  component: ParameterRow,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: [
        http.get("/api/variable/:id/", ({ params }) => {
          const id = Number(params.id);
          const variable = storyVariables.find((v) => v.id === id);
          return variable
            ? HttpResponse.json(variable, { status: 200 })
            : HttpResponse.json({ error: "Variable not found" }, { status: 404 });
        }),
        // Persist the update so the follow-up refetch returns the new distribution
        // (otherwise the form would reset the checkbox back to unticked).
        http.put("/api/variable/:id/", async ({ params, request }) => {
          const id = Number(params.id);
          const body = (await request.json()) as VariableRead;
          lastVariablePut = body;
          const index = storyVariables.findIndex((v) => v.id === id);
          if (index !== -1) {
            storyVariables[index] = { ...storyVariables[index], ...body };
          }
          return HttpResponse.json(storyVariables[index] ?? body, {
            status: 200,
          });
        }),
      ],
    },
  },
  render: () => <Harness />,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const PopulationDefaults: Story = {
  play: async ({ canvasElement, userEvent }) => {
    // Reset shared mock state between reruns.
    storyVariables.forEach((v) => {
      v.distribution = null;
    });
    lastVariablePut = null;

    const canvas = within(canvasElement);
    const clRow = (await canvas.findByText("CL")).closest("tr") as HTMLElement;
    const imaxRow = (await canvas.findByText("Imax")).closest(
      "tr",
    ) as HTMLElement;

    // Tick "Population". ParameterRow resets its form when the retrieve query
    // resolves, which can race with the click, so retry until the distribution
    // controls appear. We only click while they are absent, so we never
    // accidentally untick.
    const enablePopulation = async (row: HTMLElement, expectedLabel: string) => {
      await waitFor(
        async () => {
          const shown =
            within(row).queryByText("Log-normal") ||
            within(row).queryByText("Logit-normal");
          if (!shown) {
            await userEvent.click(within(row).getByRole("checkbox"));
          }
          expect(within(row).getByText(expectedLabel)).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    };

    // Unbounded parameter -> defaults to log-normal, variance 0.09 (the variance
    // value is asserted via the saved PUT body below).
    await enablePopulation(clRow, "Log-normal");
    await waitFor(() =>
      expect(lastVariablePut?.distribution).toMatchObject({
        pdf: "lognormal",
        variance: 0.09,
      }),
    );

    // Parameter bounded to [0, 1] -> defaults to logit-normal.
    lastVariablePut = null;
    await enablePopulation(imaxRow, "Logit-normal");
    await waitFor(() =>
      expect(lastVariablePut?.distribution).toMatchObject({
        pdf: "logit",
        variance: 0.09,
      }),
    );

    // Unticking Population removes the distribution controls.
    await userEvent.click(within(clRow).getByRole("checkbox"));
    await waitFor(() =>
      expect(within(clRow).queryByText("Log-normal")).not.toBeInTheDocument(),
    );
  },
};
