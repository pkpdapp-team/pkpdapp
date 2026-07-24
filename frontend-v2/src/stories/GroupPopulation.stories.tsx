import { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http, HttpResponse } from "msw";
import { expect, within, waitFor, waitForElementToBeRemoved, fn } from "storybook/test";
import { useDispatch } from "react-redux";

import GroupPopulation from "../features/trial/GroupPopulation";
import { setProject } from "../features/main/mainSlice";
import { project } from "./project.mock";
import {
  CovariateRead,
  CovariatePopulationRead,
  SubjectGroupRead,
} from "../app/backendApi";

const groupPatchSpy = fn();
const covariateCreateSpy = fn();
const covariateDestroySpy = fn();
const populationCreateSpy = fn();
const populationPatchSpy = fn();

const group: SubjectGroupRead = {
  id: 1,
  name: "Sim-Group 1",
  project: project.id,
  subjects: [],
  protocols: [],
  covariate_populations: [],
  study_size: 200,
  age_min: 20,
  age_max: 60,
  m2f_ratio: 0.5,
  population_region: "EU",
};

// One custom covariate that already has a population (exercises the list render
// and the "update existing population" branch of commitPopulation).
const initialCovariates: CovariateRead[] = [
  {
    id: 1,
    name: "albumin",
    type: "CONT",
    project: project.id,
  },
  {
    id: 2,
    name: "ethnicity",
    type: "CAT",
    n_categories: 3,
    project: project.id,
  },
];
const initialPopulations: CovariatePopulationRead[] = [
  {
    id: 1,
    subject_group: group.id,
    covariate: 1,
    median: 40,
    variance: 0.09,
  },
  {
    id: 2,
    subject_group: group.id,
    covariate: 2,
    category_probabilities: [0.2, 0.3, 0.5],
  },
];

let covariateMocks: CovariateRead[] = [];
let populationMocks: CovariatePopulationRead[] = [];

const meta: Meta<typeof GroupPopulation> = {
  title: "Trial Design/GroupPopulation",
  component: GroupPopulation,
  args: {
    group,
    project,
    disabled: false,
  },
  parameters: {
    layout: "padded",
    msw: {
      handlers: {
        covariates: [
          http.get("/api/covariate", async ({ request }) => {
            await delay();
            const projectId = new URL(request.url).searchParams.get(
              "project_id",
            );
            const filtered = projectId
              ? covariateMocks.filter((c) => c.project === parseInt(projectId, 10))
              : covariateMocks;
            return HttpResponse.json(filtered, { status: 200 });
          }),
          http.post("/api/covariate", async ({ request }) => {
            await delay();
            const body = (await request.json()) as CovariateRead;
            covariateCreateSpy(body);
            const newCovariate = {
              ...body,
              id: covariateMocks.length + 1,
              project: project.id,
            };
            covariateMocks.push(newCovariate);
            return HttpResponse.json(newCovariate, { status: 201 });
          }),
          http.delete("/api/covariate/:id", async ({ params }) => {
            await delay();
            const id = parseInt(params.id as string, 10);
            covariateDestroySpy(id);
            covariateMocks = covariateMocks.filter((c) => c.id !== id);
            return new HttpResponse(null, { status: 204 });
          }),
        ],
        populations: [
          http.get("/api/covariate_population", async ({ request }) => {
            await delay();
            const projectId = new URL(request.url).searchParams.get(
              "project_id",
            );
            return HttpResponse.json(populationMocks, {
              status: projectId ? 200 : 200,
            });
          }),
          http.post("/api/covariate_population", async ({ request }) => {
            await delay();
            const body = (await request.json()) as CovariatePopulationRead;
            populationCreateSpy(body);
            const newPopulation = { ...body, id: populationMocks.length + 100 };
            populationMocks.push(newPopulation);
            return HttpResponse.json(newPopulation, { status: 201 });
          }),
          http.patch(
            "/api/covariate_population/:id",
            async ({ request, params }) => {
              await delay();
              const id = parseInt(params.id as string, 10);
              const body = (await request.json()) as Partial<CovariatePopulationRead>;
              populationPatchSpy(body);
              populationMocks = populationMocks.map((p) =>
                p.id === id ? { ...p, ...body } : p,
              );
              const updated = populationMocks.find((p) => p.id === id);
              return HttpResponse.json(updated, { status: 200 });
            },
          ),
        ],
        group: [
          http.patch("/api/subject_group/:id", async ({ request }) => {
            await delay();
            const body = await request.json();
            groupPatchSpy(body);
            return HttpResponse.json({ ...group, ...(body as object) }, {
              status: 200,
            });
          }),
        ],
      },
    },
  },
  decorators: [
    (Story) => {
      const dispatch = useDispatch();
      dispatch(setProject(project.id));
      return <Story />;
    },
  ],
  beforeEach: () => {
    covariateMocks = initialCovariates.map((c) => ({ ...c }));
    populationMocks = initialPopulations.map((p) => ({ ...p }));
    groupPatchSpy.mockClear();
    covariateCreateSpy.mockClear();
    covariateDestroySpy.mockClear();
    populationCreateSpy.mockClear();
    populationPatchSpy.mockClear();
  },
};

export default meta;

type Story = StoryObj<typeof GroupPopulation>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(await canvas.findByText("Population")).toBeInTheDocument();
    expect(canvas.getByLabelText(/Study size/i)).toBeInTheDocument();
    expect(canvas.getByLabelText("Age min")).toBeInTheDocument();
    expect(canvas.getByLabelText("Age max")).toBeInTheDocument();
    expect(canvas.getByLabelText(/Male:female ratio/i)).toBeInTheDocument();
    // the seeded covariate row renders with its Median/Variance fields
    expect(await canvas.findByText("albumin")).toBeInTheDocument();
    expect(canvas.getByLabelText("Median")).toBeInTheDocument();
    expect(canvas.getByLabelText("Variance")).toBeInTheDocument();
    // "Add covariate" is disabled until a name is typed
    expect(canvas.getByRole("button", { name: /Add covariate/i })).toBeDisabled();
  },
};

export const EditPopulation: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const studySize = canvas.getByLabelText(/Study size/i);
    await userEvent.clear(studySize);
    await userEvent.type(studySize, "150");
    await userEvent.tab();
    await waitFor(() =>
      expect(groupPatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ study_size: 150 }),
      ),
    );
  },
};

export const RejectsInvalidNumber: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    // study size has min=1, integer; 0 is invalid and must be rejected
    const studySize = canvas.getByLabelText(/Study size/i);
    await userEvent.clear(studySize);
    await userEvent.type(studySize, "0");
    await userEvent.tab();
    await delayMs(300);
    expect(groupPatchSpy).not.toHaveBeenCalled();
    // the field reverted to the previous value
    expect(studySize).toHaveValue(200);
  },
};

export const ChangeRegion: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    // two MUI Selects render as comboboxes (region, then covariate type); the
    // region select is the first one
    const regionSelect = canvas.getAllByRole("combobox")[0];
    await userEvent.click(regionSelect);
    const asia = await within(document.body).findByRole("option", {
      name: "Asia",
    });
    await userEvent.click(asia);
    await waitFor(() =>
      expect(groupPatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ population_region: "ASIA" }),
      ),
    );
  },
};

export const AddContinuousCovariate: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("albumin");
    const nameField = canvas.getByLabelText("Name");
    await userEvent.type(nameField, "GFR");
    const addButton = canvas.getByRole("button", { name: /Add covariate/i });
    expect(addButton).toBeEnabled();
    await userEvent.click(addButton);
    await waitFor(() =>
      expect(covariateCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ name: "GFR", type: "CONT" }),
      ),
    );
    expect(await canvas.findByText("GFR")).toBeInTheDocument();
  },
};

export const AddCategoricalCovariate: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("albumin");
    // switch the type select (second combobox after the region select) to CAT
    const comboboxes = canvas.getAllByRole("combobox");
    const typeSelect = comboboxes[comboboxes.length - 1];
    await userEvent.click(typeSelect);
    const categorical = await within(document.body).findByRole("option", {
      name: "Categorical",
    });
    await userEvent.click(categorical);
    // the "Categories" field now appears (defaults to 2); typing exercises its
    // onChange handler
    const categories = await canvas.findByLabelText("Categories");
    expect(categories).toBeInTheDocument();
    await userEvent.type(categories, "4");
    const nameField = canvas.getByLabelText("Name");
    await userEvent.type(nameField, "genotype");
    await userEvent.click(canvas.getByRole("button", { name: /Add covariate/i }));
    await waitFor(() =>
      expect(covariateCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ name: "genotype", type: "CAT" }),
      ),
    );
  },
};

export const EditCategoricalPopulation: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("ethnicity");
    const probabilities = canvas.getByLabelText(/Category probabilities/i);
    await userEvent.clear(probabilities);
    await userEvent.type(probabilities, "0.1, 0.4, 0.5");
    await userEvent.tab();
    await waitFor(() =>
      expect(populationPatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ category_probabilities: [0.1, 0.4, 0.5] }),
      ),
    );
  },
};

export const EditCovariatePopulation: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("albumin");
    // update the existing population for albumin (update branch)
    const median = canvas.getByLabelText("Median");
    await userEvent.clear(median);
    await userEvent.type(median, "55");
    await userEvent.tab();
    await waitFor(() =>
      expect(populationPatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ median: 55 }),
      ),
    );

    // add a second covariate that has no population, then edit its median to
    // exercise the "create population" branch
    await userEvent.type(canvas.getByLabelText("Name"), "creatinine");
    await userEvent.click(canvas.getByRole("button", { name: /Add covariate/i }));
    await canvas.findByText("creatinine");
    const medianFields = canvas.getAllByLabelText("Median");
    const newMedian = medianFields[medianFields.length - 1];
    await userEvent.clear(newMedian);
    await userEvent.type(newMedian, "1.1");
    await userEvent.tab();
    await waitFor(() =>
      expect(populationCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ median: 1.1 }),
      ),
    );
  },
};

export const RemoveCovariate: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const albumin = await canvas.findByText("albumin");
    const row = albumin.closest("div");
    const deleteButton = within(row as HTMLElement).getByRole("button");
    await userEvent.click(deleteButton);
    await waitFor(() => expect(covariateDestroySpy).toHaveBeenCalledWith(1));
    await waitForElementToBeRemoved(() => canvas.queryByText("albumin"));
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByLabelText(/Study size/i)).toBeDisabled();
    expect(canvas.getByLabelText("Name")).toBeDisabled();
    expect(canvas.getByRole("button", { name: /Add covariate/i })).toBeDisabled();
  },
};

// small helper: fixed delay used to confirm a mutation did NOT fire
function delayMs(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
