import { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http, HttpResponse } from "msw";
import { expect, screen, within, userEvent } from "storybook/test";

import { TabbedModelForm } from "../features/model/Model";
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
      ],
    },
  },
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
