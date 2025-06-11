import { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http, HttpResponse } from "msw";
import { expect, screen, within, fn, waitFor } from "storybook/test";
import { useDispatch } from "react-redux";
import { setProject as setReduxProject } from "../features/main/mainSlice";

import { TabbedModelForm } from "../features/model/Model";
import {
  model,
  project,
  simulation,
  protocols,
  compound,
  variables,
  units,
  projectHandlers,
  useMockModel,
  useMockProject,
} from "./project.v3.mock";
import { pd_model, pkModels, pdModels, tagsData } from "./model.v3.mock";
import { useEffect } from "react";

const meta: Meta<typeof TabbedModelForm> = {
  title: "Edit Model (version 3)",
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
    tagsData,
    updateModel: fn(),
    updateProject: fn(),
  },
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: [
        ...projectHandlers,
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
  decorators: [
    (Story, { args }) => {
      const [model, updateMockModel] = useMockModel({
        model: args.model,
        updateModel: args.updateModel,
      });
      const [project, updateMockProject] = useMockProject({
        project: args.project,
        updateProject: args.updateProject,
      });
      const dispatch = useDispatch();
      const projectId = args.project.id;

      useEffect(() => {
        dispatch(setReduxProject(projectId));
      }, [dispatch, projectId]);

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
      name: /^PK Model/i,
    });
    const pdModelList = canvas.getByRole("combobox", { name: /^PD Model/i });

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
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const speciesList = await canvas.findByLabelText("Species");
    expect(speciesList).toHaveTextContent("Rat");

    await userEvent.click(speciesList);
    const listbox = await screen.findByRole("listbox");
    await userEvent.selectOptions(listbox, "Mouse");
    expect(speciesList).toHaveTextContent("Mouse");

    const pkModelList = await canvas.findByRole("combobox", {
      name: /^PK Model/i,
    });
    const pdModelList = canvas.getByRole("combobox", { name: /^PD Model/i });
    expect(pkModelList).toHaveTextContent("None");
    expect(pdModelList).toHaveTextContent("None");
    const errorIcon = await canvas.findByRole("img", {
      name: "Please select a PK model to simulate.",
    });
    expect(errorIcon).toBeInTheDocument();
    const checkboxes = canvas.queryAllByRole("checkbox");
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeDisabled();
    });
  },
};

export const PKModel: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const pkModelList = await canvas.findByLabelText("PK Model");
    expect(pkModelList).toHaveTextContent("1-compartmental model");

    await userEvent.click(pkModelList);
    const listbox = await screen.findByRole("listbox");
    await userEvent.selectOptions(listbox, "3-compartmental model");
    expect(pkModelList).toHaveTextContent("3-compartmental model");
  },
};

export const PDModel: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const pdModelList = await canvas.findByLabelText("PD Model");
    expect(pdModelList).toHaveTextContent("Direct effect model (inhibitory)");

    await userEvent.click(pdModelList);
    const listbox = await screen.findByRole("listbox");
    await userEvent.selectOptions(listbox, "Direct effect model (stimulatory)");
    expect(pdModelList).toHaveTextContent("Direct effect model (stimulatory)");
  },
};

export const MapVariables: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const mapVariablesTab = canvas.getByRole("tab", {
      name: /Map Variables/i,
    });
    await userEvent.click(mapVariablesTab);

    const dosingCompartmentA1 = await canvas.findByRole("checkbox", {
      name: /Dosing compartment: A1/i,
    });
    expect(dosingCompartmentA1).toBeInTheDocument();
    expect(dosingCompartmentA1).toBeChecked();

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
    const mapVariablesTab = canvas.getByRole("tab", {
      name: /Map Variables/i,
    });
    await userEvent.click(mapVariablesTab);

    const checkbox = await canvas.findByRole("checkbox", {
      name: /Secondary Parameters: C1/i,
    });
    expect(checkbox).toBeInTheDocument();
    await userEvent.click(checkbox);

    const secondaryParametersTab = canvas.getByRole("tab", {
      name: /Secondary Parameters/i,
    });
    await delay(1000);
    await userEvent.click(secondaryParametersTab);

    const addButton = canvas.getByRole("button", { name: /Add/i });
    expect(addButton).toBeInTheDocument();
    await userEvent.click(addButton);

    const timeIntervalsTable = canvas.getByRole("table", {
      name: /Define time intervals/i,
    });
    expect(timeIntervalsTable).toBeInTheDocument();

    await waitFor(() => {
      const rows = within(timeIntervalsTable).getAllByRole("row");
      expect(rows).toHaveLength(2);
    }); // Header row + 1 data row
  },
};
