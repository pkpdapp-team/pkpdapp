import { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within, screen, waitFor } from "storybook/test";
import { useForm, useFieldArray } from "react-hook-form";
import { http, HttpResponse } from "msw";
import { useDispatch } from "react-redux";

import UserAccess from "../features/projects/UserAccess";
import { FormData } from "../features/projects/Project";
import { setCredentials } from "../features/login/loginSlice";
import { project, compound } from "./project.mock";
import { ProjectAccess, UserRead } from "../app/backendApi";

// Users returned by GET /api/user. id 1 is the logged-in user and is already in
// project.user_access (so it appears in the "Shared with" table); ids 2 and 3 are
// available to add via the autocomplete.
const users = [
  {
    id: 1,
    username: "storybook_test_user",
    first_name: "Storybook",
    last_name: "Test",
    email: "test@pkpdapp.com",
    profile: { id: 1, department: "Clinical Pharmacology", user: 1 },
    project_set: [project.id],
  },
  {
    id: 2,
    username: "asmith",
    first_name: "Alice",
    last_name: "Smith",
    email: "alice.smith@pkpdapp.com",
    profile: { id: 2, department: "Pharmacometrics", user: 2 },
    project_set: [],
  },
  {
    id: 3,
    username: "bjones",
    first_name: "Bob",
    last_name: "Jones",
    email: "bob.jones@pkpdapp.com",
    profile: { id: 3, department: "Drug Metabolism", user: 3 },
    project_set: [],
  },
] as unknown as UserRead[];

const currentUser = users[0];

// A harness that supplies the react-hook-form control/append/remove that
// UserAccess needs, mirroring how Project.tsx wires the dialog. See
// Parameters.population.stories.tsx for the same pattern.
const Harness = () => {
  const { control } = useForm<FormData>({
    defaultValues: { project, compound },
  });
  const {
    fields: userAccess,
    append,
    remove,
  } = useFieldArray<FormData>({
    control,
    name: "project.user_access",
  });
  return (
    <UserAccess
      open
      project={project}
      userAccess={userAccess as ProjectAccess[]}
      append={append}
      remove={remove}
      control={control}
      onCancel={() => {}}
      onClose={() => {}}
    />
  );
};

const meta: Meta<typeof UserAccess> = {
  title: "Projects/UserAccess",
  component: UserAccess,
  parameters: {
    msw: {
      handlers: [
        http.get("/api/user", async () => {
          return HttpResponse.json(users, { status: 200 });
        }),
      ],
    },
  },
  decorators: [
    (Story) => {
      const dispatch = useDispatch();
      dispatch(setCredentials({ user: currentUser, csrf: "" }));
      return <Story />;
    },
  ],
  render: () => <Harness />,
};

export default meta;
type Story = StoryObj<typeof UserAccess>;

// The row in the "Shared with" table for a given username.
const rowForUser = (username: string) =>
  screen.getByText(username).closest("tr") as HTMLTableRowElement;

export const Default: Story = {
  play: async () => {
    // The dialog renders in a portal, so query via `screen`, not the canvas.
    // The title is a Typography h4 nested in MUI's DialogTitle (h2), so scope to
    // level 4 to avoid matching both headings.
    const title = await screen.findByRole("heading", {
      name: "Share Project",
      level: 4,
    });
    expect(title).toBeInTheDocument();

    // The shared user's row shows their full name and department.
    const row = await waitFor(() => rowForUser("storybook_test_user"));
    const rowScope = within(row);
    expect(rowScope.getByText("Storybook Test")).toBeInTheDocument();
    expect(rowScope.getByText("Clinical Pharmacology")).toBeInTheDocument();

    // No "remove access" button for the current user's own row.
    expect(rowScope.queryByRole("button")).not.toBeInTheDocument();
  },
};

export const SearchThreshold: Story = {
  play: async ({ userEvent }) => {
    const combobox = await screen.findByRole("combobox", { name: /Add user/i });
    await userEvent.click(combobox);

    // Under 3 characters: prompt shown, no options offered.
    await userEvent.type(combobox, "al");
    expect(
      await screen.findByText("Type at least 3 characters to search"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();

    // At 3 characters: matching users are offered, labelled "<username> (<name>)".
    await userEvent.type(combobox, "i");
    expect(
      await screen.findByRole("option", { name: /asmith \(Alice Smith\)/ }),
    ).toBeInTheDocument();
  },
};

export const AddUser: Story = {
  play: async ({ userEvent }) => {
    const combobox = await screen.findByRole("combobox", { name: /Add user/i });
    await userEvent.click(combobox);
    await userEvent.type(combobox, "asm");

    const option = await screen.findByRole("option", {
      name: /asmith \(Alice Smith\)/,
    });
    await userEvent.click(option);

    // The added user now appears in the table with name + department and a
    // remove button (it is not the current user).
    const row = await waitFor(() => rowForUser("asmith"));
    const rowScope = within(row);
    expect(rowScope.getByText("Alice Smith")).toBeInTheDocument();
    expect(rowScope.getByText("Pharmacometrics")).toBeInTheDocument();
    expect(rowScope.getByRole("button")).toBeInTheDocument();
  },
};

export const RemoveUser: Story = {
  play: async ({ context, userEvent }) => {
    // Start from the added-user state.
    await AddUser.play?.(context);

    const row = await waitFor(() => rowForUser("asmith"));
    await userEvent.click(within(row).getByRole("button"));

    await waitFor(() =>
      expect(screen.queryByText("asmith")).not.toBeInTheDocument(),
    );
  },
};
