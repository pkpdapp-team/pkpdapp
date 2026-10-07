#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.db.models import Count, Prefetch

from pkpdapp.models import (
    CovariatePopulation,
    Dose,
    EfficacyExperiment,
    Project,
    Protocol,
    SubjectGroup,
)


# -------------------------
# loading from the database
# -------------------------
# prefetches everything the chat context reads, to avoid redundant queries
def load_project_for_chat(project: Project) -> Project:
    return (
        # query 1: project + compound + units as one query
        Project.objects.select_related(
            "compound",
            "compound__molecular_mass_unit",
            "compound__target_molecular_mass_unit",
            "compound__target2_molecular_mass_unit",
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
        )
        .get(pk=project.pk)
    )
