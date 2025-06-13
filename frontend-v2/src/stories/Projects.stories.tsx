import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within, screen, waitFor } from "storybook/test";

import Projects from "../features/projects/Projects";
import { http, delay, HttpResponse } from "msw";

import { project, projectHandlers } from "./project.mock";
import { ProjectDescriptionProvider } from "../shared/contexts/ProjectDescriptionContext";

let mockProjects = [project];

const meta: Meta<typeof Projects> = {
  title: "Projects",
  component: Projects,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: [
        http.get("/api/project", async () => {
          await delay();
          return HttpResponse.json(mockProjects, { status: 200 });
        }),
        http.get("/api/project/:id", async ({ params }) => {
          await delay();
          //@ts-expect-error params.id is a string
          const projectId = parseInt(params.id, 10);
          const foundProject = mockProjects.find(
            (project) => project.id === projectId,
          );
          if (!foundProject) {
            return HttpResponse.json(
              { detail: "Project not found" },
              { status: 404 },
            );
          }
          return HttpResponse.json(foundProject, { status: 200 });
        }),
        http.post("/api/project", async ({ request }) => {
          await delay();
          const newProjectData = await request.json();
          // @ts-expect-error newProjectData is DefaultBodyType
          const newProject = { ...project, ...newProjectData, id: 1 };
          mockProjects.push(newProject);
          return HttpResponse.json(newProject, { status: 201 });
        }),
        http.put("/api/project/:id", async ({ params, request }) => {
          await delay();
          //@ts-expect-error params.id is a string
          const projectId = parseInt(params.id, 10);
          const updatedProject = await request.json();
          mockProjects = mockProjects.map((project) =>
            project.id === projectId
              ? // @ts-expect-error updatedProject is DefaultBodyType
                { ...project, ...updatedProject }
              : project,
          );
          return HttpResponse.json(
            // @ts-expect-error updatedProject is DefaultBodyType
            { ...updatedProject, id: projectId },
            { status: 200 },
          );
        }),
        http.delete("/api/project/:id", async ({ params }) => {
          await delay();
          //@ts-expect-error params.id is a string
          const projectId = parseInt(params.id, 10);
          mockProjects = mockProjects.filter(
            (project) => project.id !== projectId,
          );
          return HttpResponse.json({ id: projectId }, { status: 204 });
        }),
        http.get("/api/compound/:id", async () => {
          await delay();
          // Simulate fetching a compound by ID
          return HttpResponse.json(
            { id: 1, name: "Compound A", projectId: 1 },
            { status: 200 },
          );
        }),
        http.post("/api/compound/", async ({ request }) => {
          await delay();
          const newCompound = await request.json();
          // @ts-expect-error newCompound is DefaultBodyType
          return HttpResponse.json({ ...newCompound, id: 1 }, { status: 201 });
        }),
        http.put("/api/compound/:id", async ({ params, request }) => {
          await delay();
          //@ts-expect-error params.id is a string
          const compoundId = parseInt(params.id, 10);
          const updatedCompound = await request.json();
          return HttpResponse.json(
            // @ts-expect-error updatedCompound is DefaultBodyType
            { ...updatedCompound, id: compoundId },
            { status: 200 },
          );
        }),
        http.get("/api/results_table", async () => {
          await delay();
          return HttpResponse.json([], { status: 200 });
        }),
        http.post("/api/results_table", async ({ request }) => {
          await delay();
          const newTable = await request.json();
          // Simulate creating a new results table
          const createdTable = {
            //@ts-expect-error newTable is DefaultBodyType
            ...newTable,
            id: 1,
          };
          return HttpResponse.json(createdTable, { status: 201 });
        }),
        ...projectHandlers,
      ],
    },
  },
  decorators: [
    (Story) => {
      return (
        <ProjectDescriptionProvider>
          <Story />
        </ProjectDescriptionProvider>
      );
    },
  ],
  beforeEach: () => {
    mockProjects = [project];
  },
};
type Story = StoryObj<typeof Projects>;

export default meta;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const projectsHeading = await canvas.findByRole("heading", {
      name: "Projects",
    });
    expect(projectsHeading).toBeInTheDocument();

    const projectsTable = canvas.getByRole("table", {
      name: "Projects",
    });
    expect(projectsTable).toBeInTheDocument();

    await waitFor(() => {
      const projectTableRows = projectsTable.querySelectorAll("tbody tr");
      expect(projectTableRows).toHaveLength(1); // 1 header row + 1 data row
    });
    const projectRadioButton = within(projectsTable).getByRole("radio", {
      name: project.name,
    });
    expect(projectRadioButton).toBeInTheDocument();
    expect(projectRadioButton).not.toBeChecked();
  },
};

export const EditProject: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const projectRadioButton = await canvas.findByRole("radio", {
      name: project.name,
    });
    expect(projectRadioButton).toBeInTheDocument();
    expect(projectRadioButton).not.toBeChecked();
    await userEvent.click(projectRadioButton);
    expect(projectRadioButton).toBeChecked();

    const editButton = await canvas.findByRole("button", {
      name: /Edit Project/i,
    });
    expect(editButton).toBeInTheDocument();
    await userEvent.click(editButton);

    const addButton = await screen.findByRole("button", {
      name: /Add/i,
    });
    await userEvent.click(addButton);

    const descriptionTextbox = await screen.findByRole("textbox", {
      name: /Edit project description/i,
    });
    expect(descriptionTextbox).toBeInTheDocument();
  },
};

export const AddProject: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const addProjectButton = await canvas.findByRole("button", {
      name: /New Project/i,
    });
    expect(addProjectButton).toBeInTheDocument();
    await userEvent.click(addProjectButton);

    const smallMoleculeButton = await screen.findByRole("button", {
      name: "Small Molecule",
    });
    await userEvent.click(smallMoleculeButton);

    await delay(1000);

    const projectsTable = canvas.getByRole("table", {
      name: "Projects",
    });
    expect(projectsTable).toBeInTheDocument();

    const projectRadioButton = await within(projectsTable).findByRole("radio", {
      name: "untitled",
    });
    expect(projectRadioButton).toBeInTheDocument();
  },
};

export const DeleteProject: Story = {
  play: async ({ context, canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await AddProject.play?.(context);

    const projectDeleteButtons = await canvas.findAllByRole("button", {
      name: /Delete Project/i,
    });
    const [projectDeleteButton] = projectDeleteButtons;
    expect(projectDeleteButton).toBeInTheDocument();
    await userEvent.click(projectDeleteButton);

    const confirmButton = await screen.findByRole("button", {
      name: /Confirm/i,
    });
    await userEvent.click(confirmButton);
  },
};
