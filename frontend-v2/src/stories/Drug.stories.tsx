import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within, fn, waitFor } from "storybook/test";
import { useDispatch } from "react-redux";
import { setProject as setReduxProject } from "../features/main/mainSlice";

import Drug from "../features/drug/Drug";
import { project, projectHandlers } from "./project.mock";
import { http, delay, HttpResponse } from "msw";

const compoundSpy = fn();

const meta: Meta<typeof Drug> = {
  title: "Drug and Target",
  component: Drug,
  args: {
    updateCompound: compoundSpy,
  },
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: [
        ...projectHandlers,
        http.put("/api/compound/:id", async ({ params, request }) => {
          await delay();
          //@ts-expect-error params.id is a string
          const compoundId = parseInt(params.id, 10);
          const compoundData = await request.json();
          compoundSpy(compoundId, compoundData);
          return HttpResponse.json(
            {
              id: compoundId,
              //@ts-expect-error compundData is a request body
              ...compoundData,
            },
            { status: 200 },
          );
        }),
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

type Story = StoryObj<typeof Drug>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const drugHeading = await canvas.findByRole("heading", {
      name: "Drug & Target",
    });
    expect(drugHeading).toBeInTheDocument();

    const efficacyTable = await canvas.findByRole("table", {
      name: "Efficacy-Safety Data",
    });
    expect(efficacyTable).toBeInTheDocument();
    const efficacyTableRows = within(efficacyTable).getAllByRole("row");
    expect(efficacyTableRows).toHaveLength(3); // header + 2 data rows
  },
};

export const AddNew: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const addButton = await canvas.findByRole("button", {
      name: /Add New/i,
    });
    expect(addButton).toBeInTheDocument();

    await userEvent.click(addButton);
    const efficacyTable = await canvas.findByRole("table", {
      name: "Efficacy-Safety Data",
    });
    await waitFor(() => {
      const efficacyTableRows = within(efficacyTable).getAllByRole("row");
      expect(efficacyTableRows).toHaveLength(4); // header + 3 data rows
    });
  },
};
