import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, within, waitFor } from "storybook/test";
import { useState } from "react";
import { Button } from "@mui/material";

import ExampleFormatsDialog from "../features/data/ExampleFormatsDialog";
import { EXAMPLE_FORMATS } from "../features/data/exampleFormats";

// The dialog is controlled, so wrap it in a small harness with a trigger button
// to exercise the open/close flow the way the Data page uses it.
const Harness = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open example formats</Button>
      <ExampleFormatsDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
};

const meta: Meta<typeof Harness> = {
  title: "Data/Example File Formats Dialog",
  component: Harness,
};

export default meta;

type Story = StoryObj<typeof meta>;

export const OpensAndSwitchesTabs: Story = {
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const [singleDose, multipleDoses] = EXAMPLE_FORMATS;

    // Dialog is closed initially.
    expect(
      screen.queryByRole("heading", { name: "Example file formats" }),
    ).not.toBeInTheDocument();

    // Open it. The dialog is rendered in a portal, so query via `screen`.
    await userEvent.click(
      await canvas.findByRole("button", { name: "Open example formats" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Example file formats" }),
    ).toBeInTheDocument();

    // There is a tab per example format.
    for (const format of EXAMPLE_FORMATS) {
      expect(
        screen.getByRole("tab", { name: format.name }),
      ).toBeInTheDocument();
    }

    // The first tab is shown by default with its description, tips and columns.
    expect(screen.getByText(singleDose.description)).toBeInTheDocument();
    expect(screen.getByText(singleDose.tips[0])).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Observation" }),
    ).toBeInTheDocument();
    // The single-dose format has no repeat-dose columns.
    expect(
      screen.queryByRole("columnheader", { name: "II" }),
    ).not.toBeInTheDocument();

    // A per-example download link is available.
    expect(
      screen.getByRole("button", { name: /download example/i }),
    ).toBeInTheDocument();

    // Switching tabs updates the content: the multiple-doses format adds the
    // II / ADDL columns and its own explanatory notes.
    await userEvent.click(
      screen.getByRole("tab", { name: multipleDoses.name }),
    );
    expect(
      await screen.findByRole("columnheader", { name: "II" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "ADDL" }),
    ).toBeInTheDocument();
    expect(screen.getByText(multipleDoses.notes![0])).toBeInTheDocument();

    // Closing the dialog removes it from the document.
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Example file formats" }),
      ).not.toBeInTheDocument(),
    );
  },
};
