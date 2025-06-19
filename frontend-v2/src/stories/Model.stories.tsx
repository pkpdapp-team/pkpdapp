import { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http, HttpResponse } from "msw";
import { expect, screen, within, fn, waitFor } from "storybook/test";
import { useDispatch } from "react-redux";
import { setProject as setReduxProject } from "../features/main/mainSlice";

import Model from "../features/model/Model";
import { model, project, projectHandlers } from "./project.mock";
import { pkModels, pdModels } from "./model.mock";
import { TimeIntervalRead, DerivedVariableRead } from "../app/backendApi";
import { tagsData } from "./model.v3.mock";

let mockModel = { ...model };
let mockProject = { ...project };
const modelSpy = fn();
const projectSpy = fn();

const meta: Meta<typeof Model> = {
  title: "Edit Model (version 1)",
  component: Model,
  args: {
    updateModel: modelSpy,
    updateProject: projectSpy,
  },
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: {
        project: [
          http.get("/api/combined_model", async ({ request }) => {
            await delay();
            const url = new URL(request.url);

            const projectId = url.searchParams.get("project_id");
            if (projectId) {
              return HttpResponse.json([mockModel], {
                status: 200,
              });
            }
            return HttpResponse.json([], { status: 200 });
          }),
          http.get("/api/project/:id", async ({ params }) => {
            await delay();
            //@ts-expect-error params.id is a string
            const projectId = parseInt(params.id, 10);
            if (projectId === project.id) {
              return HttpResponse.json(mockProject, {
                status: 200,
              });
            }
            return HttpResponse.json(
              { error: "Project not found" },
              { status: 404 },
            );
          }),
          http.put("/api/combined_model/:id", async ({ params, request }) => {
            //@ts-expect-error params.id is a string
            const modelId = parseInt(params.id, 10);
            const modelData = await request.json();
            modelSpy(modelId, modelData);
            await delay();
            //@ts-expect-error modelData is DefaultBodyType
            const timeIntervals = modelData?.time_intervals.map(
              (interval: TimeIntervalRead, index: number) => {
                return {
                  ...interval,
                  pkpd_model: modelId,
                  id: interval.id || index + 1, // Ensure each interval has a unique ID
                };
              },
            );
            //@ts-expect-error modelData is DefaultBodyType
            const derivedVariables = modelData?.derived_variables.map(
              (variable: DerivedVariableRead, index: number) => {
                return {
                  ...variable,
                  id: variable.id || index + 1, // Ensure each derived variable has a unique ID
                };
              },
            );
            mockModel = {
              //@ts-expect-error modelData is DefaultBodyType
              ...modelData,
              id: modelId,
              time_intervals: timeIntervals,
              derived_variables: derivedVariables,
            };
            return HttpResponse.json(mockModel, {
              status: 200,
            });
          }),
          http.put("/api/project/:id", async ({ params, request }) => {
            //@ts-expect-error params.id is a string
            const projectId = parseInt(params.id, 10);
            const projectData = await request.json();
            projectSpy(projectId, projectData);
            await delay();
            //@ts-expect-error projectData is DefaultBodyType
            mockProject = { ...projectData, id: projectId };
            return HttpResponse.json(mockProject, {
              status: 200,
            });
          }),
          http.put(
            "/api/combined_model/:id/set_params_to_defaults",
            async ({ params, request }) => {
              await delay();
              //@ts-expect-error params.id is a string
              const modelId = parseInt(params.id, 10);
              const modelData = await request.json();
              //@ts-expect-error modelData is DefaultBodyType
              mockModel = { ...modelData, id: modelId };
              return HttpResponse.json(mockModel, {
                status: 200,
              });
            },
          ),
          ...projectHandlers,
        ],
        model: [
          http.get("/api/tag", async () => {
            await delay();
            return HttpResponse.json(tagsData, {
              status: 200,
            });
          }),
          http.get("/api/pharmacokinetic", async () => {
            await delay();
            return HttpResponse.json(pkModels, {
              status: 200,
            });
          }),
          http.get("/api/pharmacodynamic", async () => {
            await delay();
            return HttpResponse.json(pdModels, {
              status: 200,
            });
          }),
          http.put("/api/simulation/:id", async ({ params, request }) => {
            await delay();
            //@ts-expect-error params.id is a string
            const simulationId = parseInt(params.id, 10);
            const simulationData = await request.json();
            return HttpResponse.json(
              //@ts-expect-error simulationData is DefaultBodyType
              { ...simulationData, id: simulationId },
              {
                status: 200,
              },
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
  beforeEach: () => {
    mockModel = { ...model };
    mockProject = { ...project };
  },
};

export default meta;

type Story = StoryObj<typeof Model>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const modelTab = await canvas.findByRole("tab", { name: /PK\/PD Model/i });
    const mapVariablesTab = canvas.getByRole("tab", { name: /Map Variables/i });
    const parametersTab = canvas.getByRole("tab", { name: /^Parameters/i });
    const secondaryParametersTab = canvas.getByRole("tab", {
      name: /Secondary Parameters/i,
    });

    const speciesList = await canvas.findByRole("combobox", {
      name: /Species/i,
    });
    const pkModelList = await canvas.findByRole("combobox", {
      name: /PK Model/i,
    });
    const pdModelList = canvas.getByRole("combobox", { name: /PD Model/i });

    expect(modelTab).toBeInTheDocument();
    expect(mapVariablesTab).toBeInTheDocument();
    expect(parametersTab).toBeInTheDocument();
    expect(secondaryParametersTab).toBeInTheDocument();

    expect(speciesList).toBeInTheDocument();
    expect(pkModelList).toBeInTheDocument();
    expect(pdModelList).toBeInTheDocument();
  },
};

export const ShowMMTModel: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("tab", { name: /PK\/PD Model/i });

    const showMMTButton = await canvas.findByRole("button", {
      name: /Show MMT Code/i,
    });
    expect(showMMTButton).toBeInTheDocument();
    await userEvent.click(showMMTButton);

    const codeHeading = await screen.findByRole("heading", {
      name: /Code/i,
    });
    expect(codeHeading).toBeInTheDocument();
    const codeBlock = screen.getByRole("code");
    expect(codeBlock).toBeInTheDocument();
    expect(codeBlock.innerText).toEqual(model.mmt);
  },
};

export const Species: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("tab", {
      name: /PK\/PD Model/i,
    });
    const speciesList = await canvas.findByLabelText("Species");
    expect(speciesList).toHaveTextContent("Rat");

    await userEvent.click(speciesList);
    const listbox = await screen.findByRole("listbox");
    await userEvent.selectOptions(listbox, "Mouse");
    expect(speciesList).toHaveTextContent("Mouse");

    await delay(1000); // Wait for the model to update
    const errorTab = await canvas.findByRole("tab", {
      name: /PK\/PD Model Please select a PK model to simulate/i,
    });
    expect(errorTab).toBeInTheDocument();

    const pkModelList = await canvas.findByRole("combobox", {
      name: /PK Model/i,
    });
    const pdModelList = canvas.getByRole("combobox", { name: /PD Model/i });
    expect(pkModelList).toHaveTextContent("None");
    expect(pdModelList).toHaveTextContent("None");
    const checkboxes = canvas.queryAllByRole("checkbox");
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeDisabled();
    });
  },
};

export const PKModel: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("tab", { name: /PK\/PD Model/i });
    const pkModelList = await canvas.findByLabelText("PK Model");
    expect(pkModelList).toHaveTextContent("one_compartment_preclinical");

    await userEvent.click(pkModelList);
    const listbox = await screen.findByRole("listbox");
    await userEvent.selectOptions(listbox, "three_compartment_preclinical");
    expect(pkModelList).toHaveTextContent("three_compartment_preclinical");
  },
};

export const PDModel: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("tab", { name: /PK\/PD Model/i });
    const pdModelList = await canvas.findByLabelText("PD Model");
    expect(pdModelList).toHaveTextContent("direct_effects_emax");

    await userEvent.click(pdModelList);
    const listbox = await screen.findByRole("listbox");
    await userEvent.selectOptions(
      listbox,
      "indirect_effects_stimulation_elimination",
    );
    expect(pdModelList).toHaveTextContent(
      "indirect_effects_stimulation_elimination",
    );
  },
};

export const MapVariables: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const mapVariablesTab = await canvas.findByRole("tab", {
      name: /Map Variables/i,
    });
    await userEvent.click(mapVariablesTab);

    const dosingCompartmentA1 = await canvas.findByRole("checkbox", {
      name: /Dosing compartment: A1/i,
    });
    expect(dosingCompartmentA1).toBeInTheDocument();
    expect(dosingCompartmentA1).not.toBeChecked();
    const dosingCompartmentAa = await canvas.findByRole("checkbox", {
      name: /Dosing compartment: Aa/i,
    });
    expect(dosingCompartmentAa).toBeInTheDocument();
    expect(dosingCompartmentAa).toBeChecked();

    const linkedPDVar = await canvas.findByRole("radio", {
      name: /Link to PD: C1/i,
    });
    expect(linkedPDVar).toBeInTheDocument();
    expect(linkedPDVar).toBeChecked();
  },
};

export const SecondaryParameters: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const mapVariablesTab = await canvas.findByRole("tab", {
      name: /Map Variables/i,
    });
    await userEvent.click(mapVariablesTab);

    const checkbox = await canvas.findByRole("checkbox", {
      name: /Secondary Parameters: Ce/i,
    });
    expect(checkbox).toBeInTheDocument();
    await userEvent.click(checkbox);

    const secondaryParametersTab = canvas.getByRole("tab", {
      name: /Secondary Parameters/i,
    });
    await delay(1000);
    await userEvent.click(secondaryParametersTab);

    const timeIntervalsTable = canvas.getByRole("table", {
      name: /Define time intervals/i,
    });
    expect(timeIntervalsTable).toBeInTheDocument();
    const rows = timeIntervalsTable.querySelectorAll("tr");
    expect(rows).toHaveLength(3); // Header row + 2 time intervals

    const addButton = canvas.getByRole("button", { name: /Add/i });
    expect(addButton).toBeInTheDocument();
    await userEvent.click(addButton);

    const startTimeInput =
      await within(timeIntervalsTable).findByDisplayValue("60");
    expect(startTimeInput).toBeInTheDocument();
    const endTimeInput =
      await within(timeIntervalsTable).findByDisplayValue("80");
    expect(endTimeInput).toBeInTheDocument();
  },
};
