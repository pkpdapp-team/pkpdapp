#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.db.models import Count, Max, Min, Prefetch, Q

from pkpdapp.models import (
    BiomarkerType,
    CombinedModel,
    Correlation,
    CovariatePopulation,
    Dataset,
    DerivedVariable,
    Dose,
    EfficacyExperiment,
    Project,
    Protocol,
    ResultsTable,
    Simulation,
    SimulationPlot,
    SimulationSlider,
    SimulationYAxis,
    SubjectGroup,
    Tag,
    TimeInterval,
    Variable,
)


# -------------------------
# loading from the database
# -------------------------
# prefetches everything the chat context reads, to avoid redundant queries
def load_project_for_chat(project: Project) -> Project:
    tags = Tag.objects.order_by("name")
    # mirrors the ui's observations table: mapped types with measured points
    observation_types = (
        BiomarkerType.objects.filter(variable__isnull=False)
        .select_related("variable", "display_unit", "display_time_unit")
        .annotate(
            point_count=Count("biomarkers"),
            excluded_count=Count("biomarkers", filter=Q(biomarkers__exclude=True)),
            first_time=Min("biomarkers__time"),
            last_time=Max("biomarkers__time"),
        )
        .filter(point_count__gt=0)
        .order_by("pk")
    )

    return (
        # query 1: project + compound + units as one query
        Project.objects.select_related(
            "compound",
            "compound__molecular_mass_unit",
            "compound__target_molecular_mass_unit",
            "compound__target2_molecular_mass_unit",
            "species_weight_unit",
        )
        .prefetch_related(
            # query 2: project.compound.efficacy_experiments.all()
            Prefetch(
                "compound__efficacy_experiments",
                queryset=EfficacyExperiment.objects.select_related(
                    "c50_unit"
                ).order_by("pk"),
            ),
            # query 3: project.groups.all(), each with a subject_count
            Prefetch(
                "groups",
                queryset=SubjectGroup.objects.annotate(
                    subject_count=Count("subjects")
                ),
            ),
            # query 4: project.groups.all() -> group.protocols.all()
            Prefetch(
                "groups__protocols",
                queryset=Protocol.objects.select_related(
                    "variable", "amount_unit", "time_unit"
                ).order_by("pk"),
            ),
            # query 5: ... -> group.protocols.all() -> protocol.doses.all()
            Prefetch("groups__protocols__doses", queryset=Dose.objects.order_by("pk")),
            # query 6: project.groups.all() -> group.covariate_populations.all()
            Prefetch(
                "groups__covariate_populations",
                queryset=CovariatePopulation.objects.select_related(
                    "covariate"
                ).order_by("pk"),
            ),
            # queries 7-8: project.pk_tags.all(), project.pd_tags.all()
            Prefetch("pk_tags", queryset=tags),
            Prefetch("pd_tags", queryset=tags),
            # query 9: project.datasets.all()
            Prefetch("datasets", queryset=Dataset.objects.order_by("pk")),
            # query 10: project.datasets.all() -> dataset.chat_observation_types,
            # a filtered list, so it gets its own name instead of biomarker_types
            Prefetch(
                "datasets__biomarker_types",
                queryset=observation_types,
                to_attr="chat_observation_types",
            ),
            # query 11: project.simulations.all()
            Prefetch(
                "simulations",
                queryset=Simulation.objects.select_related(
                    "time_max_unit"
                ).order_by("pk"),
            ),
            # query 12: project.simulations.all() -> simulation.plots.all()
            Prefetch(
                "simulations__plots",
                queryset=SimulationPlot.objects.select_related(
                    "y_unit", "y_unit2"
                ).order_by("pk"),
            ),
            # query 13: ... -> simulation.plots.all() -> plot.y_axes.all()
            Prefetch(
                "simulations__plots__y_axes",
                queryset=SimulationYAxis.objects.select_related(
                    "variable"
                ).order_by("pk"),
            ),
            # query 14: project.simulations.all() -> simulation.sliders.all()
            Prefetch(
                "simulations__sliders",
                queryset=SimulationSlider.objects.select_related(
                    "variable"
                ).order_by("pk"),
            ),
            # query 15: project.results.all()
            Prefetch("results", queryset=ResultsTable.objects.order_by("pk")),
            # query 16: project.pk_models.all(), its combined model (one per project)
            Prefetch("pk_models", queryset=CombinedModel.objects.order_by("pk")),

            # ----- below, model means project.pk_models.all()[0] -----
            # model.pk_model.tags.all(), model.pd_model.tags.all() etc.
            Prefetch("pk_models__pk_model__tags", queryset=tags),
            Prefetch("pk_models__pk_model2__tags", queryset=tags),
            Prefetch("pk_models__pk_effect_model__tags", queryset=tags),
            Prefetch("pk_models__pd_model__tags", queryset=tags),
            Prefetch("pk_models__pd_model2__tags", queryset=tags),
            # query 17: model.variables.all() (+ unit)
            Prefetch(
                "pk_models__variables",
                queryset=Variable.objects.select_related(
                    "unit", "secondary_unit"
                ).order_by("pk"),
            ),
            # query 18: model.variables.all() -> variable.chat_non_dataset_protocols,
            # a filtered list, so it gets its own name instead of protocols
            Prefetch(
                "pk_models__variables__protocols",
                queryset=Protocol.objects.filter(dataset__isnull=True),
                to_attr="chat_non_dataset_protocols",
            ),
            # query 19: model.variables.all() -> variable.derived_variables.all()
            Prefetch(
                "pk_models__variables__derived_variables",
                queryset=DerivedVariable.objects.select_related(
                    "covariate", "secondary_variable"
                ).order_by("pk"),
            ),
            # query 20: model.variables.all() -> variable.pk_mappings.all()
            Prefetch("pk_models__variables__pk_mappings"),
            # query 21: model.variables.all() -> variable.distribution
            Prefetch("pk_models__variables__distribution"),
            # query 22: ... -> variable.distribution.correlations_as_1.all()
            Prefetch(
                "pk_models__variables__distribution__correlations_as_1",
                queryset=Correlation.objects.select_related(
                    "distribution_2__variable"
                ).order_by("pk"),
            ),
            # query 23: model.time_intervals.all() (+ unit)
            Prefetch(
                "pk_models__time_intervals",
                queryset=TimeInterval.objects.select_related("unit").order_by("pk"),
            ),
        )
        .get(pk=project.pk)
    )
