import { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http, HttpResponse } from "msw";
import {
  expect,
  within,
  waitFor,
  fn,
  spyOn,
  waitForElementToBeRemoved,
} from "storybook/test";

import Protocols from "../features/trial/Protocols";
import { projectProtocols, groups } from "./protocols.mock";
import { DoseRead, ProtocolRead, SubjectGroupRead } from "../app/backendApi";
import { useDispatch } from "react-redux";
import { setProject } from "../features/main/mainSlice";
import { project, projectHandlers } from "./project.mock";

const protocolSpy = fn();
const doseSpy = fn();

let protocolMocks: ProtocolRead[] = [...projectProtocols];
let groupMocks: SubjectGroupRead[] = [...groups];

function addDoseToProtocol(
  protocol: ProtocolRead,
  newDose: DoseRead,
): ProtocolRead {
  if (newDose.protocol === protocol.id) {
    return {
      ...protocol,
      doses: [...protocol.doses, newDose],
    };
  }
  return protocol;
}

const meta: Meta<typeof Protocols> = {
  title: "Trial Design",
  component: Protocols,
  args: {
    updateProtocol: protocolSpy,
    updateDose: doseSpy,
  },
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: {
        project: [
          http.get("/api/protocol", async ({ request }) => {
            await delay();
            const searchParams = new URL(request.url).searchParams;
            const projectId = searchParams.get("project_id");
            if (projectId) {
              return HttpResponse.json(protocolMocks, {
                status: 200,
              });
            }
            return HttpResponse.json([], {
              status: 200,
            });
          }),
          ...projectHandlers,
        ],
        protocols: [
          http.get("/api/subject_group", async ({ request }) => {
            await delay();
            const searchParams = new URL(request.url).searchParams;
            const projectId = searchParams.get("project_id");
            if (projectId) {
              return HttpResponse.json(groupMocks, {
                status: 200,
              });
            }
            return HttpResponse.json([], {
              status: 200,
            });
          }),
          http.get("/api/dose/:id", async ({ params }) => {
            await delay();
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
            protocolSpy(newProtocol);
            await delay();
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
          http.put("/api/dose/:id", async ({ request, params }) => {
            // @ts-expect-error params.id is a string
            const doseId = parseInt(params.id, 10);
            // @ts-expect-error request.json() is DefaultBodyType
            const updatedDose: DoseRead = await request.json();
            doseSpy(doseId, updatedDose);
            await delay();
            protocolMocks = protocolMocks.map((p) => ({ ...p }));
            protocolMocks.forEach((protocol) => {
              protocol.doses = protocol.doses.map((dose) =>
                dose.id === doseId ? updatedDose : dose,
              );
            });
            groupMocks = groupMocks.map((g) => ({ ...g }));
            groupMocks.forEach((group) => {
              group.protocols.forEach((protocol) => {
                protocol.doses = protocol.doses.map((dose) =>
                  dose.id === doseId ? updatedDose : dose,
                );
              });
            });
            return HttpResponse.json(updatedDose, {
              status: 200,
            });
          }),
          http.delete("/api/dose/:id", async ({ params }) => {
            await delay();
            // @ts-expect-error params.id is a string
            const doseId = parseInt(params.id, 10);
            protocolMocks.forEach((protocol) => {
              protocol.doses = protocol.doses.filter(
                (dose) => dose.id !== doseId,
              );
            });
            groupMocks.forEach((group) => {
              group.protocols.forEach((protocol) => {
                protocol.doses = protocol.doses.filter(
                  (dose) => dose.id !== doseId,
                );
              });
            });
            return HttpResponse.json(
              { success: true },
              {
                status: 200,
              },
            );
          }),
          http.post("/api/dose", async ({ request }) => {
            await delay();
            // @ts-expect-error request.json() is DefaultBodyType
            const newDose: DoseRead = await request.json();
            doseSpy(newDose);
            const allProtocolDoses = protocolMocks.flatMap(
              (protocol) => protocol.doses,
            );
            const allGroupDoses = groupMocks.flatMap((group) =>
              group.protocols.flatMap((protocol) => protocol.doses),
            );
            const allDoses = [...allProtocolDoses, ...allGroupDoses];
            const maxDoseId = Math.max(...allDoses.map((dose) => dose.id), 0);
            newDose.id = maxDoseId + 1;
            protocolMocks = protocolMocks.map((protocol) => {
              return addDoseToProtocol(protocol, newDose);
            });
            groupMocks = groupMocks.map((group) => {
              if (
                group.protocols.some(
                  (protocol) => protocol.id === newDose.protocol,
                )
              ) {
                return {
                  ...group,
                  protocols: group.protocols.map((protocol) => {
                    return addDoseToProtocol(protocol, newDose);
                  }),
                };
              }
              return group;
            });
            return HttpResponse.json(newDose, {
              status: 201,
            });
          }),
          http.post("/api/subject_group", async ({ request }) => {
            await delay();
            const responseBody = await request.json();
            const newGroup: SubjectGroupRead = {
              // @ts-expect-error responseBody can't be spread
              ...responseBody,
              id: groupMocks.length + 1, // Simple ID generation
              subjects: [],
            };
            const maxProtocolId = Math.max(
              ...protocolMocks.map((p) => p.id),
              0,
            );
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
          http.delete("/api/subject_group/:id", async ({ params }) => {
            await delay();
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
  },
  decorators: [
    (Story) => {
      const dispatch = useDispatch();
      dispatch(setProject(project.id));
      return <Story />;
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
    const projectTab = await canvas.findByRole("tab", { name: /Sim-Group 1/i });
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
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("tab", { name: /Sim-Group 1/i });
    const addRowButton = await canvas.findByRole("button", {
      name: /Add New Row/i,
    });
    expect(addRowButton).toBeInTheDocument();
    expect(canvas.getAllByRole("row")).toHaveLength(3);
    await userEvent.click(addRowButton);
    await waitFor(() => expect(canvas.getAllByRole("row")).toHaveLength(4));
  },
};

export const DeleteRow: Story = {
  play: async ({ context, canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    await AddRow.play?.(context);
    const removeDoseButton = await canvas.findByRole("button", {
      name: /Remove Dose/i,
    });
    expect(removeDoseButton).toBeInTheDocument();
    await userEvent.click(removeDoseButton);
    await waitFor(() => expect(canvas.getAllByRole("row")).toHaveLength(3));
  },
};

export const AddGroup: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const addGroupButton = await canvas.findByRole("button", {
      name: /Add Group/i,
    });
    expect(addGroupButton).toBeInTheDocument();
    expect(canvas.getAllByRole("tab")).toHaveLength(1);
    await userEvent.click(addGroupButton);
    await waitFor(() => expect(canvas.getAllByRole("tab")).toHaveLength(2));
    const newGroupTab = canvas.getByRole("tab", { name: /Sim-Group 1/i });
    expect(newGroupTab).toBeInTheDocument();
    await userEvent.click(newGroupTab);
  },
};

export const DeleteGroup: Story = {
  play: async ({ context, canvasElement, userEvent }) => {
    const confirmSpy = spyOn(window, "confirm").mockImplementation(() => true); // Mock confirm dialog to always return true
    const canvas = within(canvasElement);
    await AddGroup.play?.(context);
    const groupTab = await canvas.findByRole("tab", { name: /Sim-Group 2/i });
    expect(groupTab).toBeInTheDocument();
    // TODO: buttons within buttons are invalid HTML, and an accessibility error.
    const deleteButton = await within(groupTab).findByRole("button");
    expect(deleteButton).toBeInTheDocument();
    await userEvent.click(deleteButton);
    await waitForElementToBeRemoved(groupTab);

    confirmSpy.mockRestore(); // Restore original confirm function
  },
};
