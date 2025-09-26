import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within, fn, waitFor, spyOn, screen } from "storybook/test";
import { useDispatch } from "react-redux";
import { setProject as setReduxProject } from "../features/main/mainSlice";

import Drug from "../features/drug/Drug";
import { project, projectHandlers } from "./project.mock";
import { http, delay, HttpResponse } from "msw";

const compoundSpy = fn();
const deleteEfficacyExperimentSpy = fn();

let experimentId = 0;

const meta: Meta<typeof Drug> = {
  title: "Drug and Target",
  component: Drug,
  args: {
    updateCompound: compoundSpy,
  },
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: {
        project: projectHandlers,
        compound: [
          http.put("/api/compound/:id", async ({ params, request }) => {
            await delay();
            //@ts-expect-error params.id is a string
            const compoundId = parseInt(params.id, 10);
            const compoundData = await request.json();
            compoundSpy(compoundId, compoundData);
            let experimentId = 0;
            //@ts-expect-error compoundData is a request body
            compoundData?.efficacy_experiments?.forEach(
              (experiment: { id?: number }) => {
                experimentId = experiment.id || experimentId + 1;
                experiment.id = experimentId;
              },
            );

            return HttpResponse.json(
              {
                id: compoundId,
                //@ts-expect-error compoundData is a request body
                ...compoundData,
              },
              { status: 200 },
            );
          }),
          http.post("/api/efficacy_experiment/", async ({ request }) => {
            await delay();
            const experimentData = await request.json();
            return HttpResponse.json(
              {
                id: experimentId++,
                //@ts-expect-error experimentData is a request body
                ...experimentData,
              },
              { status: 201 },
            );
          }),
          http.put(
            "/api/efficacy_experiment/:id",
            async ({ params, request }) => {
              await delay();
              //@ts-expect-error params.id is a string
              const experimentId = parseInt(params.id, 10);
              const experimentData = await request.json();
              return HttpResponse.json(
                {
                  id: experimentId,
                  //@ts-expect-error experimentData is a request body
                  ...experimentData,
                },
                { status: 200 },
              );
            },
          ),
          http.delete("/api/efficacy_experiment/:id", async ({ params }) => {
            await delay();
            //@ts-expect-error params.id is a string
            const experimentId = parseInt(params.id, 10);
            deleteEfficacyExperimentSpy(experimentId);
            return HttpResponse.json(
              {
                id: experimentId,
              },
              { status: 204 },
            );
          }),
        ],
      },
    },
  },
  decorators: [
    (Story) => {
      const dispatch = useDispatch();
      dispatch(setReduxProject(project.id));
      return <Story />;
    },
  ],
};
export default meta;

type Story = StoryObj<typeof Drug>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const drugHeading = await canvas.findByRole("heading", {
      name: "Drug & Target",
    });
    expect(drugHeading).toBeInTheDocument();

    const efficacyTable = await canvas.findByRole("table", {
      name: "Efficacy-Safety Data",
    });
    expect(efficacyTable).toBeInTheDocument();
    const efficacyTableRows = within(efficacyTable).getAllByRole("row");
    expect(efficacyTableRows).toHaveLength(1); // header + 0 data rows
  },
};

export const EditMolecularWeightUnit: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const molecularWeightUnit = await canvas.findByTestId("select-molecular_mass_unit");
    const molecularWeightUnitCombobox = await within(molecularWeightUnit).findByRole("combobox");

    expect(molecularWeightUnit).toBeInTheDocument();
    expect(molecularWeightUnitCombobox).toHaveTextContent("g/mol (Da)");

    await userEvent.click(molecularWeightUnitCombobox);
    const unitListBox = await screen.findByRole("listbox");
    await userEvent.selectOptions(unitListBox, "kg/mol (kDa)");
    expect(molecularWeightUnitCombobox).toHaveTextContent("kg/mol (kDa)");
  },
};

export const AddNew: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const addButton = await canvas.findByRole("button", {
      name: /Add New/i,
    });
    expect(addButton).toBeInTheDocument();

    await userEvent.click(addButton);
    const efficacyTable = await canvas.findByRole("table", {
      name: "Efficacy-Safety Data",
    });
    await waitFor(() => {
      const efficacyTableRows = within(efficacyTable).getAllByRole("row");
      expect(efficacyTableRows).toHaveLength(2); // header + 1 data row
    });
  },
};

export const AddMultiple: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const addButton = await canvas.findByRole("button", {
      name: /Add New/i,
    });
    expect(addButton).toBeInTheDocument();

    const efficacyTable = await canvas.findByRole("table", {
      name: "Efficacy-Safety Data",
    });
    await userEvent.click(addButton);
    await waitFor(() => {
      const efficacyTableRows = within(efficacyTable).getAllByRole("row");
      expect(efficacyTableRows).toHaveLength(2); // header + 1 data row
    });
    await userEvent.click(addButton);
    await waitFor(() => {
      const efficacyTableRows = within(efficacyTable).getAllByRole("row");
      expect(efficacyTableRows).toHaveLength(3); // header + 2 data rows
    });
    await userEvent.click(addButton);
    await waitFor(() => {
      const efficacyTableRows = within(efficacyTable).getAllByRole("row");
      expect(efficacyTableRows).toHaveLength(4); // header + 3 data rows
    });

    const deleteButtons = within(efficacyTable).getAllByRole("button", {
      name: /Delete/i,
    });
    expect(deleteButtons).toHaveLength(3);

    const confirmSpy = spyOn(window, "confirm").mockImplementation(() => true); // Mock confirm dialog to always return true
    await userEvent.click(deleteButtons[0]);
    await waitFor(() => {
      const efficacyTableRows = within(efficacyTable).getAllByRole("row");
      expect(efficacyTableRows).toHaveLength(3); // header + 2 data rows
    });
    confirmSpy.mockRestore(); // Restore original confirm function
  },
};

export const EditExperiment: Story = {
  play: async ({ context, canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await AddNew.play?.(context);

    const efficacyTable = await canvas.findByRole("table", {
      name: "Efficacy-Safety Data",
    });
    expect(efficacyTable).toBeInTheDocument();

    const editButton = await within(efficacyTable).findByRole("button", {
      name: /Edit/i,
    });
    expect(editButton).toBeInTheDocument();

    await userEvent.click(editButton);

    const nameInput = await canvas.findByRole("textbox", {
      name: /Name/i,
    });
    expect(nameInput).toBeInTheDocument();
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Updated Experiment Name");

    const saveButton = await canvas.findByRole("button", {
      name: /Save/i,
    });
    expect(saveButton).toBeInTheDocument();
    await userEvent.click(saveButton);

    const experimentRadio = await canvas.findByRole("radio", {
      name: /Updated Experiment Name/i,
    });
    expect(experimentRadio).toBeInTheDocument();
  },
};

export const SelectExperiment: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const addButton = await canvas.findByRole("button", {
      name: /Add New/i,
    });
    expect(addButton).toBeInTheDocument();

    const efficacyTable = await canvas.findByRole("table", {
      name: "Efficacy-Safety Data",
    });
    await userEvent.click(addButton);
    await waitFor(() => {
      const efficacyTableRows = within(efficacyTable).getAllByRole("row");
      expect(efficacyTableRows).toHaveLength(2); // header + 1 data row
    });
    await userEvent.click(addButton);
    await waitFor(() => {
      const efficacyTableRows = within(efficacyTable).getAllByRole("row");
      expect(efficacyTableRows).toHaveLength(3); // header + 2 data rows
    });
    await userEvent.click(addButton);
    await waitFor(() => {
      const efficacyTableRows = within(efficacyTable).getAllByRole("row");
      expect(efficacyTableRows).toHaveLength(4); // header + 3 data rows
    });

    const radioButtons = within(efficacyTable).getAllByRole("radio");
    expect(radioButtons).toHaveLength(3);

    const firstRadio = radioButtons[0];
    expect(firstRadio).toBeInTheDocument();
    expect(firstRadio).toBeChecked();

    const secondRadio = radioButtons[1];
    expect(secondRadio).toBeInTheDocument();
    expect(secondRadio).not.toBeChecked();

    await userEvent.click(secondRadio);
    expect(firstRadio).not.toBeChecked();
    expect(secondRadio).toBeChecked();
  },
};
