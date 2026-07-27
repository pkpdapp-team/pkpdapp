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
  modelHandlers,
  variableHandlers,
  datasetHandlers,
  subjectHandlers,
  subjectGroupHandlers,
  biomarkerTypeHandlers,
} from "./generated-mocks";

const meta: Meta<typeof Data> = {
  title: "Data Upload (create dataset)/Dimensionless Observation",
  component: Data,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: [
        ...projectHandlers,
        ...modelHandlers,
        ...protocolHandlers,
        ...unitHandlers,
        ...variableHandlers,
        ...simulationHandlers,
        ...datasetHandlers,
        ...subjectHandlers,
        ...subjectGroupHandlers,
        ...biomarkerTypeHandlers,
      ],
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

/**
 * Reproduces a bug where mapping a dimensionless observation to a dimensionless
 * model output variable is incorrectly rejected with
 * "Mapped observation variables must have units."
 *
 * The CSV observation column has a "dimensionless" unit, and the selected model
 * output ("E") is also dimensionless. Selecting the variable should be allowed
 * and the user should be able to proceed, but instead an error is raised.
 *
 * The observation unit stored on the row is the string "dimensionless", while
 * the compatible units for a dimensionless variable use the empty-string symbol
 * "". The mismatch in `handleObservationChange` (MapObservations.tsx) means the
 * unit is treated as incompatible.
 */
export const MapDimensionlessObservation: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    // Upload a CSV whose observation column ("Conc") uses a dimensionless unit.
    const fileInput = canvasElement.querySelector("input[type=file]");
    expect(fileInput).toBeInTheDocument();

    const csvWithDimensionless = `ID;Group;Route;Time;Units_Time;Conc;Units_Conc;AMT;Units_AMT
1;1;IV;0;h;;;50;mg
1;1;IV;2;h;0.5;dimensionless;;
1;1;IV;4;h;0.8;dimensionless;;
2;1;SC;0;h;;;75;mg
2;1;SC;2;h;0.4;dimensionless;;
2;1;SC;4;h;0.6;dimensionless;;`;

    const file = new File([csvWithDimensionless], "test_dimensionless.csv", {
      type: "text/csv",
    });
    await userEvent.upload(fileInput as HTMLInputElement, file);

    const dataTableHeading = await canvas.findByRole("heading", {
      name: "Imported Data Table",
    });
    expect(dataTableHeading).toBeInTheDocument();

    // Next -> Stratification
    const nextButton = await canvas.findByRole("button", { name: "Next" });
    await userEvent.click(nextButton);

    const stratificationHeading = await canvas.findByRole("heading", {
      name: "Stratification",
    });
    expect(stratificationHeading).toBeInTheDocument();

    // Stratify by Route (creates two groups: IV and SC)
    const routeRadio = await canvas.findByRole("radio", { name: "Route" });
    await userEvent.click(routeRadio);
    expect(routeRadio).toBeChecked();

    // Next -> Map Dosing
    const nextButton2 = await canvas.findByRole("button", { name: "Next" });
    await userEvent.click(nextButton2);

    const mapDosingHeading = await canvas.findByRole("heading", {
      name: "Dosing",
    });
    expect(mapDosingHeading).toBeInTheDocument();

    // Map both dosing rows to compartment A1.
    const variableSelects = await canvas.findAllByRole("combobox", {
      name: "Variable",
    });
    expect(variableSelects.length).toBe(2);

    await userEvent.click(variableSelects[0]);
    let listbox = await screen.findByRole("listbox");
    let a1Option = await within(listbox).findByRole("option", { name: "A1" });
    await userEvent.selectOptions(listbox, a1Option);

    await userEvent.click(variableSelects[1]);
    listbox = await screen.findByRole("listbox");
    a1Option = await within(listbox).findByRole("option", { name: "A1" });
    await userEvent.selectOptions(listbox, a1Option);

    // Next -> Map Observations
    await waitFor(
      () => {
        const nextBtn = canvas.getByRole("button", { name: "Next" });
        expect(nextBtn).not.toBeDisabled();
      },
      { timeout: 5000 },
    );
    await userEvent.click(canvas.getByRole("button", { name: "Next" }));

    const mapObservationsHeading = await canvas.findByRole("heading", {
      name: "Observations",
    });
    expect(mapObservationsHeading).toBeInTheDocument();

    // The observation unit should already display as "dimensionless".
    const unitSelect = canvas.getByRole("combobox", { name: "Units" });
    expect(unitSelect).toHaveTextContent("dimensionless");

    // Map the observation to the dimensionless model output "E".
    const obsVariableSelect = canvas.getByRole("combobox", { name: "Variable" });
    await userEvent.click(obsVariableSelect);
    const obsListbox = await screen.findByRole("listbox");
    const eOption = await within(obsListbox).findByRole("option", { name: "E" });
    await userEvent.selectOptions(obsListbox, eOption);

    // The unit is dimensionless and E is dimensionless, so this mapping is valid
    // and the user should be able to proceed without any "must have units"
    // error being raised.

    // Open the Notifications panel to inspect the reported errors.
    const notificationsButton = await canvas.findByRole("button", {
      name: /Notifications/,
    });
    await userEvent.click(notificationsButton);

    await expect(
      canvas.queryByText("Mapped observation variables must have units."),
    ).not.toBeInTheDocument();

    await waitFor(
      () => {
        const nextBtn = canvas.getByRole("button", { name: "Next" });
        expect(nextBtn).not.toBeDisabled();
      },
      { timeout: 5000 },
    );
  },
};
