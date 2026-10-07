#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from pydantic import BaseModel

from pkpdapp.models import Compound, Project
from pkpdapp.utils.chatbot_context.drug_and_target import DrugTargetContext
from pkpdapp.utils.chatbot_context.trial_design import TrialDesignContext


# -------
# project
# -------
class CompoundContext(BaseModel):
    name: str
    modality: str

    @classmethod
    def from_compound(cls, compound: Compound):
        return cls(name=compound.name, modality=compound.get_compound_type_display())


class ProjectContext(BaseModel):
    name: str
    description: str
    compound: CompoundContext
    drug_and_target_page: DrugTargetContext
    trial_design_page: TrialDesignContext

    @classmethod
    def from_project(cls, project: Project, *, can_edit: bool):
        return cls(
            name=project.name,
            description=project.description,
            compound=CompoundContext.from_compound(project.compound),
            drug_and_target_page=DrugTargetContext.from_compound(
                project.compound, can_edit=can_edit
            ),
            trial_design_page=TrialDesignContext.from_project(
                project, can_edit=can_edit
            ),
        )
