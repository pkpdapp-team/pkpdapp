import { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import { expect, within } from "storybook/test";

import { TabbedModelForm } from "./Model";
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
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;

type Story = StoryObj<typeof TabbedModelForm>;

export const Default: Story = {
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
    msw: {
      handlers: [
        http.get("/api/pharmacokinetic", () => {
          return HttpResponse.json(pkModels, {
            status: 200,
          });
        }),
        http.get("/api/pharmacodynamic", () => {
          return HttpResponse.json(pdModels, {
            status: 200,
          });
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const modelTab = canvas.getByRole("tab", { name: /PK\/PD Model/i });
    const mapVariablesTab = canvas.getByRole("tab", { name: /Map Variables/i });
    const parametersTab = canvas.getByRole("tab", { name: /^Parameters/i });
    const secondaryParametersTab = canvas.getByRole("tab", {
      name: /Secondary Parameters/i,
    });

    expect(modelTab).toBeInTheDocument();
    expect(mapVariablesTab).toBeInTheDocument();
    expect(parametersTab).toBeInTheDocument();
    expect(secondaryParametersTab).toBeInTheDocument();
  },
};
