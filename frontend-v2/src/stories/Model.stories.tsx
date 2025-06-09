import { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http, HttpResponse } from "msw";
import { expect, screen, within, userEvent, fn } from "storybook/test";

import {
  CombinedModelUpdate,
  ProjectUpdate,
  TabbedModelForm,
} from "../features/model/Model";
import {
  model,
  pd_model,
  project,
  simulation,
  variables,
  protocols,
  compound,
  units,
  pkModels,
  pdModels,
} from "./model.mock";
import {
  useCombinedModelUpdateMutation,
  useProjectUpdateMutation,
} from "../app/backendApi";
import { useState } from "react";

// Use mutable copies of snapshots to allow for API updates.
let mockModel = { ...model };
let mockProject = { ...project };

const meta: Meta<typeof TabbedModelForm> = {
  title: "Model/TabbedModelForm",
  component: TabbedModelForm,
  args: {
    model,
    pd_model,
    project,
    simulation,
    variables,
    protocols,
    compound,
    units,
    updateModel: fn(),
    updateProject: fn(),
  },
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: [
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
        http.put("/api/combined_model/:id", async ({ params, request }) => {
          await delay();
          //@ts-expect-error params.id is a string
          const modelId = parseInt(params.id, 10);
          const modelData = await request.json();
          //@ts-expect-error modelData is DefaultBodyType
          mockModel = { ...modelData, id: modelId };
          return HttpResponse.json(mockModel, {
            status: 200,
          });
        }),
        http.put("/api/project/:id", async ({ params, request }) => {
          await delay();
          //@ts-expect-error params.id is a string
          const projectId = parseInt(params.id, 10);
          const projectData = await request.json();
          //@ts-expect-error projectData is DefaultBodyType
          mockProject = { ...projectData, id: projectId };
          return HttpResponse.json(mockProject, {
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
      ],
    },
  },
  decorators: [
    (Story, { args }) => {
      const [model, setModel] = useState(args.model);
      const [project, setProject] = useState(args.project);
      const [updateModel] = useCombinedModelUpdateMutation();
      const [updateProject] = useProjectUpdateMutation();
      const updateMockModel: CombinedModelUpdate = async ({
        id,
        combinedModel,
      }) => {
        args.updateModel({ id, combinedModel });
        await updateModel({ id, combinedModel });
        mockModel = { ...mockModel, ...combinedModel };
        setModel(mockModel);
        return mockModel;
      };
      const updateMockProject: ProjectUpdate = async ({ id, project }) => {
        args.updateProject({ id, project });
        await updateProject({ id, project });
        mockProject = { ...mockProject, ...project };
        setProject(mockProject);
        return mockProject;
      };
      return (
        <TabbedModelForm
          {...args}
          model={model}
          project={project}
          updateModel={updateMockModel}
          updateProject={updateMockProject}
        />
      );
    },
  ],
};

export default meta;

type Story = StoryObj<typeof TabbedModelForm>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const modelTab = canvas.getByRole("tab", { name: /PK\/PD Model/i });
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

export const Species: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const speciesList = await canvas.findByLabelText("Species");
    expect(speciesList).toHaveTextContent("Rat");

    await userEvent.click(speciesList);
    const listbox = await screen.findByRole("listbox");
    await userEvent.selectOptions(listbox, "Mouse");
    expect(speciesList).toHaveTextContent("Mouse");

    const pkModelList = await canvas.findByRole("combobox", {
      name: /PK Model/i,
    });
    const pdModelList = canvas.getByRole("combobox", { name: /PD Model/i });
    expect(pkModelList).toHaveTextContent("None");
    expect(pdModelList).toHaveTextContent("None");
    const errorIcon = await canvas.findByRole("img", {
      name: "Please select a PK model to simulate.",
    });
    expect(errorIcon).toBeInTheDocument();
    const checkboxes = canvas.queryAllByRole("checkbox");
    expect(checkboxes).toHaveLength(0);
  },
};

export const PKModel: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const pkModelList = await canvas.findByLabelText("PK Model");
    expect(pkModelList).toHaveTextContent("one_compartment_preclinical");

    await userEvent.click(pkModelList);
    const listbox = await screen.findByRole("listbox");
    await userEvent.selectOptions(listbox, "three_compartment_preclinical");
    expect(pkModelList).toHaveTextContent("three_compartment_preclinical");
  },
};

export const PDModel: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
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
