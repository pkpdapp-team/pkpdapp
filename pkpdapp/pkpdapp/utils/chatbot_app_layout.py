#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from pydantic import BaseModel


# what the chatbot is told about the app, sent as json under [APP LAYOUT];
# update it by hand when the ui changes
class Page(BaseModel):
    # as shown in the ui
    name: str
    description: str
    sub_pages: list["Page"] | None = None


class TopBarItem(BaseModel):
    name: str
    description: str


class AppLayout(BaseModel):
    sidebar_pages: list[Page]
    top_bar: list[TopBarItem]
    notes: list[str]


APP_LAYOUT = AppLayout(
    sidebar_pages=[
        Page(
            name="Projects",
            description="Lists the user's projects to create, open, edit and share.",
        ),
        Page(
            name="Drug and Target",
            description="Properties of the drug and its targets.",
        ),
        Page(
            name="Model",
            description="Sets up the PK/PD model, in tabs (sub pages).",
            sub_pages=[
                Page(
                    name="PK/PD Model",
                    description="Choose the species and the PK and PD models.",
                ),
                Page(
                    name="Map Variables",
                    description="Connect the model's variables to dosing and outputs.",
                ),
                Page(name="Parameters", description="Set the model's parameters."),
                Page(
                    name="Secondary Parameters",
                    description="Set up how secondary parameters are calculated.",
                ),
            ],
        ),
        Page(
            name="Data",
            description=(
                "Upload and view observed data, one tab per data group with "
                "one table of its Protocols (doses) and one table of its Observations."
            ),
        ),
        Page(
            name="Trial Design",
            description="Define the subject groups, one tab per group.",
        ),
        Page(
            name="Simulations",
            description="Simulate the model, plot it and fit it to data.",
        ),
        Page(
            name="Results",
            description="Tables of secondary parameters from the simulations.",
        ),
    ],
    top_bar=[
        TopBarItem(
            name="Project name and document icon",
            description="The icon opens the project description.",
        ),
        TopBarItem(
            name="Gems",
            description="Links to related Gemini Gems, only on some deployments.",
        ),
        TopBarItem(name="Chat", description="Opens and closes this chat panel."),
        TopBarItem(
            name="Help",
            description="Opens the Help & Feedback page (may have little content).",
        ),
        TopBarItem(name="Exit", description="Logs the user out."),
    ],
    notes=[
        "The sidebar lists Projects, then the other pages as steps in order.",
        "In projects shared with the user as read-only, editing is disabled.",
    ],
)

# shown above the [CURRENT USER CONTEXT] json
CONTEXT_NOTES = [
    "The JSON is a snapshot of what the user sees in the app, grouped like the "
    "pages and sub pages in [APP LAYOUT]. It starts with the page and sub page "
    "the user is on now.",
    "A missing field means the UI does not show it.",
    "Checkboxes and options say whether they are selected (ticked) and enabled "
    "(changeable by the user).",
    "Correlations only list stored pairs; a missing pair has a coefficient of 0.",
]
