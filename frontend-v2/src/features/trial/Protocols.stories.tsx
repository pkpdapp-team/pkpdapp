import { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import { expect, fn, within } from "storybook/test";

import { Protocols } from "./Protocols";
import {
  project,
  projectProtocols,
  variables,
  units,
  groups,
} from "./protocols.mock";

const meta: Meta<typeof Protocols> = {
  title: "Trial/Protocols",
  component: Protocols,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;

type Story = StoryObj<typeof Protocols>;

export const Default: Story = {
  args: {
    project,
    projectProtocols,
    variables,
    units,
    groups,
    refetchGroups: fn(),
    refetchProtocols: fn(),
    isSharedWithMe: false,
  },
  parameters: {
    msw: {
      handlers: [
        http.get("/api/variable/2401", () => {
          return HttpResponse.json(
            variables.find((v) => v.id === 2401),
            {
              status: 200,
            },
          );
        }),
        http.get("/api/dose/9857", () => {
          return HttpResponse.json(projectProtocols[0].doses[0], {
            status: 200,
          });
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const projectTab = canvas.getByRole("tab", { name: /Project/i });
    const addGroupButton = canvas.getByRole("button", { name: /Add Group/i });
    const addRowButton = await canvas.findByRole("button", {
      name: /Add New Row/i,
    });
    expect(addGroupButton).toBeInTheDocument();
    expect(addRowButton).toBeInTheDocument();
    expect(projectTab).toBeInTheDocument();
  },
};
