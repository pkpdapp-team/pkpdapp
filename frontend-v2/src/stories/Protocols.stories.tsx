import { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import { expect, fn, within, userEvent, waitFor } from "storybook/test";

import { Protocols } from "../features/trial/Protocols";
import {
  project,
  projectProtocols,
  variables,
  units,
  groups,
} from "./protocols.mock";
import { DoseRead } from "../app/backendApi";
import { useState } from "react";

let protocolMocks = [...projectProtocols];

const meta: Meta<typeof Protocols> = {
  title: "Trial/Protocols",
  component: Protocols,
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
    layout: "fullscreen",
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
        http.get("/api/dose/:id", ({ params }) => {
          //@ts-expect-error params.id is a string
          const doseId = parseInt(params.id, 10);
          const allDoses = protocolMocks.flatMap((protocol) => protocol.doses);
          const dose = allDoses.find((d) => d.id === doseId);
          return HttpResponse.json(dose, {
            status: 200,
          });
        }),
        http.put("/api/protocol/4083", async ({ request }) => {
          const newProtocol = await request.json();
          let newDoseId = 0;
          // @ts-expect-error newProtocol might be undefined
          newProtocol.doses.forEach((dose: DoseRead) => {
            if (dose.id) {
              newDoseId = dose.id;
            } else {
              dose.id = newDoseId + 1;
            }
          });
          protocolMocks = protocolMocks.map((protocol) =>
            // @ts-expect-error newProtocol might be undefined
            protocol.id === newProtocol.id ? newProtocol : protocol,
          );
          return HttpResponse.json(newProtocol, {
            status: 200,
          });
        }),
      ],
    },
  },
  decorators: [
    () => {
      const [protocols, setProtocols] = useState(projectProtocols);
      const refetchProtocols = () => {
        setProtocols(protocolMocks);
      };
      return (
        <Protocols
          project={project}
          groups={groups}
          variables={variables}
          units={units}
          projectProtocols={protocols}
          refetchProtocols={refetchProtocols}
          refetchGroups={fn()}
          isSharedWithMe={false}
        />
      );
    },
  ],
};

export default meta;

type Story = StoryObj<typeof Protocols>;

export const Default: Story = {
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

export const AddRow: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const addRowButton = await canvas.findByRole("button", {
      name: /Add New Row/i,
    });
    expect(addRowButton).toBeInTheDocument();
    expect(canvas.getAllByRole("row")).toHaveLength(3);
    await userEvent.click(addRowButton);
    await waitFor(() => expect(canvas.getAllByRole("row")).toHaveLength(4));
  },
};
