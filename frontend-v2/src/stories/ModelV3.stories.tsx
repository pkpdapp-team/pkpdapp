import { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http, HttpResponse } from "msw";
import {
  expect,
  screen,
  within,
  fn,
  waitForElementToBeRemoved,
  waitFor,
} from "storybook/test";
import { useDispatch } from "react-redux";
import { setProject as setReduxProject } from "../features/main/mainSlice";

import Model from "../features/model/Model";
import {
  project,
  projectHandlers,
  pkModels,
  pdModels,
  tags as tagsData,
  combinedModels,
} from "./generated-mocks";
import { TimeIntervalRead, DerivedVariableRead } from "../app/backendApi";

const model = combinedModels[0];
let mockModel = { ...model };
let mockProject = { ...project };
const modelSpy = fn();
const projectSpy = fn();
const setParamsToDefaultSpy = fn();

const meta: Meta<typeof Model> = {
  title: "Edit Model (version 3)",
  component: Model,
  args: {
    updateModel: modelSpy,
    updateProject: projectSpy,
    setParamsToDefault: setParamsToDefaultSpy,
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
              // Return a clone to prevent RTK Query from caching a mutable reference
              return HttpResponse.json([structuredClone(mockModel)], {
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
              // Return a clone to prevent RTK Query from caching a mutable reference
              return HttpResponse.json(structuredClone(mockProject), {
                status: 200,
              });
            }
            return HttpResponse.json(
              { error: "Project not found" },
              { status: 404 },
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
              setParamsToDefaultSpy({ id: modelId, combinedModel: mockModel });
              // Return a clone to prevent RTK Query from caching a mutable reference
              return HttpResponse.json(structuredClone(mockModel), {
                status: 200,
              });
            },
          ),
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
            // Return a clone to prevent RTK Query from caching a mutable reference
            return HttpResponse.json(structuredClone(mockModel), {
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
          http.get("/api/pharmacodynamic/:id", async ({ params }) => {
            await delay();
            //@ts-expect-error params.id is a string
            const modelId = parseInt(params.id, 10);
            const pdModel = pdModels.find((m) => m.id === modelId);
            if (pdModel) {
              return HttpResponse.json(pdModel, {
                status: 200,
              });
            }
            return HttpResponse.json(
              { error: "PD Model not found" },
              { status: 404 },
            );
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
    // Use structuredClone to create deep copies and prevent mutations from persisting
    mockModel = structuredClone(model);
    mockProject = structuredClone(project);
    modelSpy.mockClear();
    projectSpy.mockClear();
    setParamsToDefaultSpy.mockClear();
  },
};

export default meta;

type UserEvent = {
  click: (element: HTMLElement) => Promise<void>;
  selectOptions: (element: HTMLElement, value: string) => Promise<void>;
};

async function selectMenuOption(
  comboBox: HTMLElement,
  option: string,
  userEvent: UserEvent,
): Promise<void> {
  await userEvent.click(comboBox);
  const listbox: HTMLElement = await screen.findByRole("listbox");
  await userEvent.selectOptions(listbox, option);
  return waitFor(() => expect(comboBox).toHaveTextContent(option));
}

async function assertMenuOptions(
  comboBox: HTMLElement,
  options_exist: string[],
  options_not_exist: string[],
  userEvent: UserEvent,
): Promise<void> {
  await userEvent.click(comboBox);
  const listbox: HTMLElement = await screen.findByRole("listbox");
  for (const option of options_exist) {
    expect(listbox).toHaveTextContent(option);
  }
  for (const option of options_not_exist) {
    expect(listbox).not.toHaveTextContent(option);
  }
}

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

export const ShowMMTCode: Story = {
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

export const PkFiltering: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("tab", { name: /PK\/PD Model/i });
    const pkModelCombo = await canvas.findByLabelText("PK Model");
    expect(pkModelCombo).toHaveTextContent("1-compartmental model");

    await selectMenuOption(pkModelCombo, "None", userEvent);

    const [pkFilterTags, pdFilterTags] = await canvas.findAllByRole(
      "combobox",
      {
        name: /Filter By Model Type/i,
      },
      {},
    );

    expect(pkFilterTags).toBeInTheDocument();
    expect(pdFilterTags).toBeInTheDocument();

    // filter by 2-compartment
    await selectMenuOption(pkFilterTags, "1-compartment", userEvent);
    assertMenuOptions(
      pkModelCombo,
      ["1-compartmental model"],
      ["2-compartmental model", "3-compartmental model"],
      userEvent,
    );
  },
};

export const PdFiltering: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("tab", { name: /PK\/PD Model/i });

    const [pkFilterTags, pdFilterTags] = await canvas.findAllByRole(
      "combobox",
      {
        name: /Filter By Model Type/i,
      },
      {},
    );

    expect(pkFilterTags).toBeInTheDocument();
    expect(pdFilterTags).toBeInTheDocument();

    const pdModelCombo = await canvas.findByLabelText("PD Model");
    expect(pdModelCombo).toHaveTextContent("Direct effect model (inhibitory)");
    await selectMenuOption(pdModelCombo, "None", userEvent);
    await selectMenuOption(pdFilterTags, "direct", userEvent);
    assertMenuOptions(
      pdModelCombo,
      ["Direct effect model (inhibitory)", "Direct effect model (stimulatory)"],
      [
        "Indirect effect model (inhibition of elimination)",
        "Tumor growth model (linear)",
      ],
      userEvent,
    );
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

    const speciesWeight = await canvas.findByRole("spinbutton", {
      name: /Weight/i,
    });
    expect(speciesWeight).toHaveValue(0.025);

    const unitList = await canvas.findByRole("combobox", {
      name: /Unit/i,
    });
    expect(unitList).toHaveTextContent("kg");

    await waitFor(() => expect(setParamsToDefaultSpy).toHaveBeenCalledOnce());
  },
};

export const PKModel: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("tab", { name: /PK\/PD Model/i });
    const pkModelList = await canvas.findByLabelText("PK Model");
    expect(pkModelList).toHaveTextContent("1-compartmental model");

    await selectMenuOption(
      pkModelList,
      "1-compartmental bispecific TMDD model",
      userEvent,
    );
  },
};

export const PDModel: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("tab", { name: /PK\/PD Model/i });
    const pdModelList = await canvas.findByLabelText("PD Model");
    expect(pdModelList).toHaveTextContent("Direct effect model (inhibitory)");

    await selectMenuOption(
      pdModelList,
      "Direct effect model (stimulatory)",
      userEvent,
    );
  },
};

export const TumourGrowthModel: Story = {
  parameters: {
    test: {
      timeout: 45000, // Increase timeout for this complex test
    },
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("tab", { name: /PK\/PD Model/i });
    const pdModelList = await canvas.findByLabelText("PD Model");
    expect(pdModelList).toHaveTextContent("Direct effect model (inhibitory)");

    await selectMenuOption(
      pdModelList,
      "Tumor growth model (linear)",
      userEvent,
    );

    const secondaryPDModelSelect = await canvas.findByRole(
      "combobox",
      {
        name: /Secondary PD Model/i,
      },
      {
      },
    );
    expect(secondaryPDModelSelect).toBeInTheDocument();
    await selectMenuOption(
      secondaryPDModelSelect,
      "TGI cell distribution model (Emax kill)",
      userEvent,
    );

    // change to another tumour growth model and check secondary model is the same
    await selectMenuOption(
      pdModelList,
      "Tumor growth model (Gompertz)",
      userEvent,
    );
    expect(secondaryPDModelSelect).toBeInTheDocument();
    expect(secondaryPDModelSelect).toHaveTextContent(
      "TGI cell distribution model (Emax kill)",
    );

    // change to non-tumour model and check secondary model is removed
    await selectMenuOption(
      pdModelList,
      "Indirect effect model (inhibition of elimination)",
      userEvent,
    );
    await waitForElementToBeRemoved(secondaryPDModelSelect, {
    });
  },
};

export const HillCoefficient: Story = {
  parameters: {
    test: {
      timeout: 20000, // Increase timeout to 20 seconds for this complex test
    },
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("tab", { name: /PK\/PD Model/i });
    const pdModelList = await canvas.findByLabelText("PD Model", {});
    expect(pdModelList).toHaveTextContent("Direct effect model (inhibitory)");

    let hillCoefficientCheckbox = await canvas.findByRole(
      "checkbox",
      {
        name: /Hill coefficient/i,
      },
      {},
    );
    expect(hillCoefficientCheckbox).toBeInTheDocument();
    expect(hillCoefficientCheckbox).not.toBeChecked();
    await userEvent.click(hillCoefficientCheckbox);
    expect(hillCoefficientCheckbox).toBeChecked();

    await selectMenuOption(
      pdModelList,
      "Tumor growth model (linear)",
      userEvent,
    );
    await waitForElementToBeRemoved(hillCoefficientCheckbox, {
      timeout: 3000,
    });

    await selectMenuOption(
      pdModelList,
      "Indirect effect model (inhibition of elimination)",
      userEvent,
    ); // Deselect the PD model
    hillCoefficientCheckbox = await canvas.findByRole(
      "checkbox",
      {
        name: /Hill coefficient/i,
      },
      {
        },
    );
    expect(hillCoefficientCheckbox).toBeInTheDocument();
    expect(hillCoefficientCheckbox).toBeChecked();

    await selectMenuOption(
      pdModelList,
      "Tumor growth model (linear)",
      userEvent,
    );
    await waitForElementToBeRemoved(hillCoefficientCheckbox, {
    });

    const secondaryPDModelSelect = await canvas.findByRole(
      "combobox",
      {
        name: /Secondary PD Model/i,
      },
      {
        },
    );
    expect(secondaryPDModelSelect).toBeInTheDocument();
    await selectMenuOption(
      secondaryPDModelSelect,
      "TGI signal distribution model (Emax kill)",
      userEvent,
    );
    hillCoefficientCheckbox = await canvas.findByRole(
      "checkbox",
      {
        name: /Hill coefficient/i,
      },
      {
        },
    );
    expect(hillCoefficientCheckbox).toBeInTheDocument();
  },
};

export const LagTime: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("tab", { name: /PK\/PD Model/i });

    const pkModelList = await canvas.findByLabelText("Extravascular PK Model");

    const notLagTimeCheckbox = await canvas.queryByRole("checkbox", {
      name: /Lag time/i,
    });
    expect(notLagTimeCheckbox).not.toBeInTheDocument();

    await selectMenuOption(
      pkModelList,
      "First order absorption model",
      userEvent,
    );

    await delay(1000);

    const lagTimeCheckbox = await canvas.findByRole("checkbox", {
      name: /Lag time/i,
    });
    expect(lagTimeCheckbox).not.toBeChecked();
    await userEvent.click(lagTimeCheckbox);
    expect(lagTimeCheckbox).toBeChecked();

    await delay(1000); // Wait for the model to update
    const errorTab = await canvas.findByRole("tab", {
      name: /Map Variables Please select a lag time variable/i,
    });
    expect(errorTab).toBeInTheDocument();
    await userEvent.click(errorTab);

    const lagTimeCheckbox2 = await canvas.findByRole("checkbox", {
      name: /Lag time: A1/i,
    });
    expect(lagTimeCheckbox2).toBeInTheDocument();
    expect(lagTimeCheckbox2).not.toBeChecked();
    await userEvent.click(lagTimeCheckbox2);
    expect(lagTimeCheckbox2).toBeChecked();

    // Test that the error message has disappeared.
    await delay(1000); // Wait for the model to update
    const mapVariablesTab = await canvas.findByRole("tab", {
      name: "Map Variables",
    });
    expect(mapVariablesTab).toBeInTheDocument();
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
    expect(dosingCompartmentA1).toBeChecked();

    const linkedPDVar = await canvas.findByRole("radio", {
      name: /Link to PD: C1/i,
    });
    expect(linkedPDVar).toBeInTheDocument();
    expect(linkedPDVar).toBeChecked();
  },
};

export const Parameters: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const parametersTab = await canvas.findByRole("tab", {
      name: /^Parameters$/i,
    });
    await userEvent.click(parametersTab);
    const cl_parameter_text = await canvas.findByText("CL");
    expect(cl_parameter_text).toBeInTheDocument();
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
      name: /Secondary Parameters: C1/i,
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
    expect(rows).toHaveLength(1); // Header row

    const addButton = canvas.getByRole("button", { name: /Add/i });
    expect(addButton).toBeInTheDocument();
    await userEvent.click(addButton);

    const startTimeInput = await within(timeIntervalsTable).findByRole(
      "spinbutton",
      {
        name: /Start time/i,
      },
    );
    expect(startTimeInput).toBeInTheDocument();
    const endTimeInput = await within(timeIntervalsTable).findByRole(
      "spinbutton",
      {
        name: /End time/i,
      },
    );
    expect(endTimeInput).toBeInTheDocument();

    const thresholdsTable = canvas.getByRole("table", {
      name: /Define thresholds and variable units/i,
    });
    const unitSelect = await within(thresholdsTable).findByRole("combobox", {
      name: /Unit: C1/i,
    });
    expect(unitSelect).toBeInTheDocument();
    expect(unitSelect).toHaveTextContent("µg/mL");
  },
};

export const ChangeSecondaryUnit: Story = {
  play: async ({ canvasElement, userEvent, context }) => {
    await SecondaryParameters.play?.(context);

    const canvas = within(canvasElement);
    const thresholdsTable = canvas.getByRole("table", {
      name: /Define thresholds and variable units/i,
    });
    const unitSelect = await within(thresholdsTable).findByRole("combobox", {
      name: /Unit: C1/i,
    });
    expect(unitSelect).toBeInTheDocument();
    expect(unitSelect).toHaveTextContent("µg/mL");

    await selectMenuOption(unitSelect, "pmol/L", userEvent);

    await waitFor(() => {
      expect(unitSelect).toHaveTextContent("pmol/L");
    });
  },
};
