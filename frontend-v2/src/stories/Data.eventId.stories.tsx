import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within, screen } from "storybook/test";
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
      const filtered = variables.filter(
        (v) => v.dosed_pk_model === parseInt(dosedPkModelId, 10),
      );
      return HttpResponse.json(filtered, { status: 200 });
    }
    return HttpResponse.json(variables, { status: 200 });
  }),
  http.get("/api/variable/:id/", ({ params }) => {
    const variable = variables.find((v) => v.id === Number(params.id));
    if (variable) {
      return HttpResponse.json(variable, { status: 200 });
    }
    return HttpResponse.json(null, { status: 404 });
  }),
];

const meta: Meta<typeof Data> = {
  title: "Data Upload (create dataset)/Event ID Classification",
  component: Data,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: {
        project: [
          ...projectHandlers,
          ...protocolHandlers,
          ...unitHandlers,
          ...simulationHandlers,
        ],
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

// CSV where the AMT (amount) column is populated on EVERY row, including
// observation rows, and an EVID column distinguishes them: EVID 1 = dose,
// EVID 0 = observation. The dose rows use amount 100, the observation rows use
// a distinct amount 50. Only the EVID==1 rows should be treated as doses; the
// observation rows must NOT be pulled into the dosing protocol even though they
// carry an amount.
const csvWithEventId = `ID;Time;Units_Time;Conc;Units_Conc;AMT;Units_AMT;EVID
1;0;h;.;mg/L;100;mg;1
1;2;h;10;mg/L;50;mg;0
1;4;h;8;mg/L;50;mg;0
2;0;h;.;mg/L;100;mg;1
2;2;h;12;mg/L;50;mg;0
2;4;h;9;mg/L;50;mg;0`;

export const UploadFileWithEventId: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    const fileInput = canvasElement.querySelector("input[type=file]");
    expect(fileInput).toBeInTheDocument();

    const file = new File([csvWithEventId], "test_event_id.csv", {
      type: "text/csv",
    });
    await userEvent.upload(fileInput as HTMLInputElement, file);

    // Verify the data table is shown with all rows (6 data + 1 header).
    const dataTable = await canvas.findByRole("table", {
      name: "Imported Data Table",
    });
    const rows = within(dataTable).getAllByRole("row");
    expect(rows.length).toBe(7);

    // The EVID column should be auto-detected as "Event ID".
    const allSelects = within(dataTable).getAllByRole("combobox");
    const eventIdSelect = allSelects.find(
      (select) => select.textContent === "Event ID",
    );
    expect(eventIdSelect).toBeInTheDocument();
  },
};

// Follow-on: navigate to Map Dosing and verify that only the EVID==1 rows are
// treated as doses. With two subjects each dosed once at t=0 with amount 100,
// the dosing protocol should show a single (deduplicated) dose row and must not
// include the observation rows' amount (50).
export const OnlyEventIdDosesAreDosingRows: Story = {
  play: async ({ context, canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    //@ts-expect-error play function arg types mismatch
    await UploadFileWithEventId.play(context);

    // Next -> Stratification
    const nextButton = await canvas.findByRole("button", { name: "Next" });
    await userEvent.click(nextButton);

    await canvas.findByRole("heading", { name: "Stratification" });

    // Use the default single group. Next -> Map Dosing
    const nextButton2 = await canvas.findByRole("button", { name: "Next" });
    await userEvent.click(nextButton2);

    await canvas.findByRole("heading", { name: "Dosing" });

    // Assign a dosing compartment to the single administration.
    const variableSelect = canvas.getByRole("combobox", { name: "Variable" });
    await userEvent.click(variableSelect);
    const listbox = await screen.findByRole("listbox");
    const a1Option = await within(listbox).findByRole("option", { name: "A1" });
    await userEvent.selectOptions(listbox, a1Option);

    const dosingTable = await canvas.findByRole("table", { name: "Dosing" });
    // One header row + exactly one deduplicated dose row (both EVID==1 rows
    // share amount/time/group). Before the Event ID fix, every amount-bearing
    // row was a dose, so the observation rows (amount 50) added extra rows here.
    const dosingRows = within(dosingTable).getAllByRole("row");
    expect(dosingRows.length).toBe(2);

    // The observation-row amount (50) must not appear in the dosing protocol.
    expect(dosingTable.textContent).not.toContain("50");
  },
};
