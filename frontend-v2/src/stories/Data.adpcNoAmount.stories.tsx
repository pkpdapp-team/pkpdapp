import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within, screen, waitFor } from "storybook/test";
import { useDispatch } from "react-redux";
import { setProject as setReduxProject } from "../features/main/mainSlice";

import Data from "../features/data/Data";
import {
  project,
  projectHandlers,
  protocolHandlers,
  unitHandlers,
  simulationHandlers,
  combinedModels,
  variables,
  subjectGroupHandlers,
} from "./generated-mocks/index";

import { HttpResponse, http } from "msw";

const datasetHandlers = [
  http.get("/api/dataset/:id", () => {
    return HttpResponse.json(
      {
        id: 1,
        name: "Test Dataset",
        subjects: [],
        groups: [],
      },
      { status: 200 },
    );
  }),
  ...subjectGroupHandlers,
  http.get("/api/subject", () => {
    return HttpResponse.json([], { status: 200 });
  }),
  http.get("/api/biomarker_type", () => {
    return HttpResponse.json([], { status: 200 });
  }),
  http.get("/api/combined_model", ({ request }) => {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("project_id");
    if (projectId && parseInt(projectId) === project.id) {
      return HttpResponse.json(combinedModels, { status: 200 });
    }
    return HttpResponse.json([], { status: 200 });
  }),
  http.get("/api/variable", ({ request }) => {
    const url = new URL(request.url);
    const dosedPkModelId = url.searchParams.get("dosed_pk_model_id");
    if (dosedPkModelId) {
      const filtered = variables.filter(v => v.dosed_pk_model === parseInt(dosedPkModelId, 10));
      return HttpResponse.json(filtered, { status: 200 });
    }
    return HttpResponse.json(variables, { status: 200 });
  }),
];

const meta: Meta<typeof Data> = {
  title: "Data Upload (create dataset)/ADPC - No Amount Column",
  component: Data,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: {
        project: [...projectHandlers, ...protocolHandlers, ...unitHandlers, ...simulationHandlers],
        dataset: datasetHandlers,
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

type Story = StoryObj<typeof Data>;

// Test that uploads a CSV file with NO AMT (dosing amount) column
// Only contains observation rows (Conc) and a "Dose" column with value 10
// This should prompt the user to enter a dose amount when mapping dosing
export const UploadFileWithNoDoseAmount: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    const fileInput = canvasElement.querySelector("input[type=file]");
    expect(fileInput).toBeInTheDocument();

    // Create CSV WITHOUT AMT column - only has Conc observations and a Dose column
    // The Dose column has value 10 for each row
    const csvWithoutAmount = `ID;Time;Units_Time;Conc;Units_Conc;Dose
1;0;h;.;mg/L;10
1;2;h;10;mg/L;10
1;4;h;8;mg/L;10
1;8;h;5;mg/L;10
2;0;h;.;mg/L;10
2;2;h;12;mg/L;10
2;4;h;9;mg/L;10
2;8;h;6;mg/L;10
3;0;h;.;mg/L;10
3;2;h;15;mg/L;10
3;4;h;12;mg/L;10
3;8;h;7;mg/L;10`;

    const file = new File([csvWithoutAmount], "test_no_amount.csv", { type: "text/csv" });
    await userEvent.upload(fileInput as HTMLInputElement, file);

    // Verify the notification about no dosing information is shown
    const noDosingNotification = await canvas.findByText(
      "This CSV contains no dosing information. Dosing amounts and units can be set in Trial Design."
    );
    expect(noDosingNotification).toBeInTheDocument();

    // Verify the notification about Dose covariate being used is shown
    const doseCovariateNotification = await canvas.findByText(
      "Dose or DOSEA continuous covariate found, using this value for dosing amount."
    );
    expect(doseCovariateNotification).toBeInTheDocument();

    // Verify data table is shown
    const dataTableHeading = await canvas.findByRole("heading", {
      name: "Imported Data Table",
    });
    expect(dataTableHeading).toBeInTheDocument();

    const dataTable = canvas.getByRole("table", {
      name: "Imported Data Table",
    });
    expect(dataTable).toBeInTheDocument();

    // Check that we have the correct number of rows (12 data + 1 header)
    const rows = within(dataTable).getAllByRole("row");
    expect(rows.length).toBe(13);

    // Verify there's NO AMT column in the uploaded data
    const allSelects = within(dataTable).getAllByRole("combobox");
    const amtSelectIndex = allSelects.findIndex(
      (select) => select.textContent === "Amount"
    );
    // Should NOT find Amount column in the initial upload
    expect(amtSelectIndex).toBe(-1);

    // Verify the Dose column is mapped to "Cont Covariate"
    // Since the CSV has a Dose column, verify it's been categorized as a continuous covariate
    const contCovariateSelect = allSelects.find(
      (select) => select.textContent === "Cont Covariate"
    );
    expect(contCovariateSelect).toBeInTheDocument();
  },
};

// Follow-on test: After uploading CSV without Amount column,
// navigate to Map Dosing and verify dose amount input is prompted
export const MapDosingWithoutAmountColumn: Story = {
  play: async ({ context, canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    //@ts-expect-error play function arg types mismatch
    await UploadFileWithNoDoseAmount.play(context);

    // Click Next to go to Stratification
    const nextButton = await canvas.findByRole("button", {
      name: "Next",
    });
    expect(nextButton).toBeInTheDocument();
    await userEvent.click(nextButton);

    const stratificationHeading = await canvas.findByRole("heading", {
      name: "Stratification",
    });
    expect(stratificationHeading).toBeInTheDocument();

    // Use default stratification (single group)
    // Click Next to proceed to Map Dosing
    const nextButton2 = await canvas.findByRole("button", {
      name: "Next",
    });
    await userEvent.click(nextButton2);

    // Wait for Map Dosing page
    const mapDosingHeading = await canvas.findByRole("heading", {
      name: "Dosing",
    });
    expect(mapDosingHeading).toBeInTheDocument();

    // Verify we have 1 dosing protocol row (one group)
    const variableSelects = canvas.getAllByRole("combobox", {
      name: "Variable",
    });
    expect(variableSelects.length).toBe(1);

    // Select a dosing compartment
    await userEvent.click(variableSelects[0]);
    const listbox = await screen.findByRole("listbox");
    const a1Option = await within(listbox).findByRole("option", {
      name: "A1",
    });
    await userEvent.selectOptions(listbox, a1Option);

    // Since there's no AMT column, the amount input field should be visible
    // and should allow the user to enter a dose amount
    const amountInputs = canvas.getAllByRole("spinbutton", {
      name: "Amount",
    });
    expect(amountInputs.length).toBe(1);

    // The amount input should be populated with the value from the Dose column (10)
    // This tests that the Dose column value is automatically used to populate the amount
    await waitFor(() => {
      expect(amountInputs[0]).toHaveValue(10);
    });
  },
};
