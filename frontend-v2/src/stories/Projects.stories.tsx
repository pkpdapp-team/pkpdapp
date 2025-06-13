import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within, waitFor } from "storybook/test";

import Projects from "../features/projects/Projects";
import { http, delay, HttpResponse } from "msw";

import { project, projectHandlers } from "./project.mock";

const meta: Meta<typeof Projects> = {
  title: "Projects",
  component: Projects,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: [
        ...projectHandlers,
        http.get("/api/project", async () => {
          await delay();
          return HttpResponse.json([project], { status: 200 });
        }),
        http.post("/api/project", async ({ request }) => {
          await delay();
          const newProject = await request.json();
          // @ts-expect-error newProject is DefaultBodyType
          return HttpResponse.json({ ...newProject, id: 1 }, { status: 201 });
        }),
        http.put("/api/project/:id", async ({ params, request }) => {
          await delay();
          //@ts-expect-error params.id is a string
          const projectId = parseInt(params.id, 10);
          const updatedProject = await request.json();
          return HttpResponse.json(
            // @ts-expect-error updatedProject is DefaultBodyType
            { ...updatedProject, id: projectId },
            { status: 200 },
          );
        }),
      ],
    },
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
      const projectTableRows = within(projectsTable).getAllByRole("row");
      expect(projectTableRows).toHaveLength(2); // 1 header row + 1 data row
    });
    const projectRadioButton = within(projectsTable).getByRole("radio", {
      name: project.name,
    });
    expect(projectRadioButton).toBeInTheDocument();
    expect(projectRadioButton).not.toBeChecked();
  },
};
