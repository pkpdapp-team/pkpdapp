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
import { DoseRead, ProtocolRead, SubjectGroupRead } from "../app/backendApi";
import { useState } from "react";

let protocolMocks: ProtocolRead[] = [...projectProtocols];
let groupMocks: SubjectGroupRead[] = [...groups];

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
        http.get("/api/variable/:id", ({ params }) => {
          //@ts-expect-error params.id is a string
          const variableId = parseInt(params.id, 10);
          return HttpResponse.json(
            variables.find((v) => v.id === variableId),
            {
              status: 200,
            },
          );
        }),
        http.get("/api/dose/:id", ({ params }) => {
          //@ts-expect-error params.id is a string
          const doseId = parseInt(params.id, 10);
          const allProtocolDoses = protocolMocks.flatMap(
            (protocol) => protocol.doses,
          );
          const allGroupDoses = groupMocks.flatMap((group) =>
            group.protocols.flatMap((protocol) => protocol.doses),
          );
          const allDoses = [...allProtocolDoses, ...allGroupDoses];
          const dose = allDoses.find((d) => d.id === doseId);
          return HttpResponse.json(dose, {
            status: 200,
          });
        }),
        http.put("/api/protocol/:id", async ({ request }) => {
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
          // @ts-expect-error protocolMocks might be undefined
          protocolMocks = protocolMocks.map((protocol) =>
            // @ts-expect-error newProtocol might be undefined
            protocol.id === newProtocol.id ? newProtocol : protocol,
          );
          groupMocks.forEach((group) => {
            // @ts-expect-error group.protocols might be undefined
            group.protocols = group.protocols.map((protocol) =>
              // @ts-expect-error newProtocol might be undefined
              protocol.id === newProtocol.id ? newProtocol : protocol,
            );
          });
          return HttpResponse.json(newProtocol, {
            status: 200,
          });
        }),
        http.post("/api/subject_group", async ({ request }) => {
          const responseBody = await request.json();
          const newGroup: SubjectGroupRead = {
            // @ts-expect-error responseBody can't be spread
            ...responseBody,
            id: groupMocks.length + 1, // Simple ID generation
            subjects: [],
          };
          const maxProtocolId = Math.max(...protocolMocks.map((p) => p.id), 0);
          // @ts-expect-error responseBody might be undefined
          newGroup.protocols = responseBody.protocols.map(
            (protocol: ProtocolRead, index: number) => ({
              ...protocol,
              id: maxProtocolId + index + 1, // Assign new ID if not provided
            }),
          );
          groupMocks.push(newGroup);
          return HttpResponse.json(newGroup, {
            status: 201,
          });
        }),
        http.delete("/api/subject_group/:id", ({ params }) => {
          // @ts-expect-error params.id is a string
          const groupId = parseInt(params.id, 10);
          groupMocks = groupMocks.filter((group) => group.id !== groupId);
          return HttpResponse.json(
            { success: true },
            {
              status: 200,
            },
          );
        }),
      ],
    },
  },
  decorators: [
    () => {
      const [protocols, setProtocols] = useState(projectProtocols);
      const [groups, setGroups] = useState(groupMocks);
      const refetchProtocols = () => {
        setProtocols(protocolMocks);
      };
      const refetchGroups = () => {
        setGroups(groupMocks);
      };
      return (
        <Protocols
          project={project}
          groups={groups}
          variables={variables}
          units={units}
          projectProtocols={protocols}
          refetchProtocols={refetchProtocols}
          refetchGroups={refetchGroups}
          isSharedWithMe={false}
        />
      );
    },
  ],
  beforeEach: () => {
    protocolMocks = [...projectProtocols];
    groupMocks = [...groups];
  },
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

export const AddGroup: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const addGroupButton = canvas.getByRole("button", { name: /Add Group/i });
    expect(addGroupButton).toBeInTheDocument();
    expect(canvas.getAllByRole("tab")).toHaveLength(1);
    await userEvent.click(addGroupButton);
    await waitFor(() => expect(canvas.getAllByRole("tab")).toHaveLength(2));
    const newGroupTab = canvas.getByRole("tab", { name: /Group 1/i });
    expect(newGroupTab).toBeInTheDocument();
    await userEvent.click(newGroupTab);
  },
};
