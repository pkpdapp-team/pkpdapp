#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
# flake8: noqa F401

# the chat context mirrors the ui, from the root down: ChatContext (chat_context.py)
# -> ProjectContext (project.py) -> pages (drug_and_target.py, model_page.py,
# data_page.py, trial_design.py, simulations_page.py, results_page.py) -> model tabs
# (model_*.py) and page parts -> rows and fields
# the from_* methods read relations that loaders.py prefetches (see the
# comments there for what each one holds)

from .shared import SelectionContext
from .drug_and_target import EfficacySafetyContext, DrugTargetContext
from .model_pkpd import ModelComponentContext, PKPDModelContext
from .model_map_variables import (
    DosingVariableContext,
    VariableMappingContext,
    MapVariablesContext,
)
from .model_parameters import (
    NonlinearityInputContext,
    NonlinearityContext,
    ParameterCovariateContext,
    ParameterCovariatesContext,
    ParameterPopulationContext,
    ParameterContext,
    ParameterCorrelationContext,
    ParametersContext,
)
from .model_secondary_parameters import (
    TimeIntervalContext,
    VariableThresholdContext,
    SecondaryParametersContext,
)
from .model_page import ModelContext
from .data_page import ObservationTypeContext, DataPageContext
from .simulations_page import SimulationPlotContext, SimulationsContext
from .results_page import ResultsTableContext, ResultsContext
from .trial_design import (
    DoseContext,
    ProtocolContext,
    GroupPopulationContext,
    ContinuousCovariateContext,
    CategoricalCovariateContext,
    SubjectGroupContext,
    TrialDesignContext,
)
from .project import CompoundContext, ProjectContext
from .loaders import load_project_for_chat
from .chat_context import ChatContext
