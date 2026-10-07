#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from pydantic import BaseModel

from pkpdapp.models import Project
from pkpdapp.utils.chatbot_context.project import ProjectContext
from pkpdapp.utils.chatbot_context.loaders import load_project_for_chat


# ---------------------------------------
# chat context: the root of the hierarchy
# ---------------------------------------
class ChatContext(BaseModel):
    current_page: str | None
    current_sub_page: str | None
    project: ProjectContext | None

    @classmethod
    def from_project(
        cls,
        project: Project,
        *,
        can_edit: bool,
        current_page: str | None,
        current_sub_page: str | None,
    ):
        # reload the project with everything the context reads
        project = load_project_for_chat(project)
        return cls(
            current_page=current_page,
            current_sub_page=current_sub_page,
            project=ProjectContext.from_project(project, can_edit=can_edit),
        )
