#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from pydantic import BaseModel

from pkpdapp.models import Compound, Project
from pkpdapp.utils.chatbot_context.data_page import DataPageContext
from pkpdapp.utils.chatbot_context.drug_and_target import DrugTargetContext
from pkpdapp.utils.chatbot_context.model_page import ModelContext
from pkpdapp.utils.chatbot_context.results_page import ResultsContext
from pkpdapp.utils.chatbot_context.simulations_page import SimulationsContext
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
    model_page: ModelContext | None
    data_page: DataPageContext
    trial_design_page: TrialDesignContext
    simulations_page: SimulationsContext | None
    results_page: ResultsContext

    @classmethod
    def from_project(cls, project: Project, *, can_edit: bool):
        models = project.pk_models.all()
        # the ui uses the first model
        model = models[0] if models else None
        model_page = None
        simulations_page = None
        if model is not None:
            model_page = ModelContext.from_combined_model(model, can_edit=can_edit)
            # the ui uses the first simulation
            simulations = project.simulations.all()
            if simulations:
                simulations_page = SimulationsContext.from_simulation(
                    simulations[0], model
                )
        return cls(
            name=project.name,
            description=project.description,
            compound=CompoundContext.from_compound(project.compound),
            drug_and_target_page=DrugTargetContext.from_compound(
                project.compound, can_edit=can_edit
            ),
            model_page=model_page,
            data_page=DataPageContext.from_project(project),
            trial_design_page=TrialDesignContext.from_project(
                project, can_edit=can_edit
            ),
            simulations_page=simulations_page,
            results_page=ResultsContext.from_project(project),
        )
