#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.db.models import Prefetch

from pkpdapp.models import CovariatePopulation, Dose


def build_chat_context(project):
    """Build the persisted, ORM-backed context supplied to the chatbot."""
    context = {
        "project": {
            "name": project.name,
            "description": project.description,
            "species": project.species,
        }
    }

    model = _get_model(project)
    if model is not None:
        context["model"] = {
            "name": model.name,
            "species": model.species,
            "has_saturation": model.has_saturation,
            "has_extravascular": model.has_extravascular,
            "has_effect": model.has_effect,
            "has_lag": model.has_lag,
            "has_hill_coefficient": model.has_hill_coefficient,
            "pk_model_name": (
                model.pk_model.name if model.pk_model is not None else None
            ),
            "pd_model_name": (
                model.pd_model.name if model.pd_model is not None else None
            ),
            "mmt": model.get_mmt(),
        }
        context["variables"] = [
            {
                "name": variable.name,
                "value": variable.default_value,
                "unit": (
                    variable.unit.symbol
                    if variable.unit is not None
                    else variable.unit_symbol
                ),
                "constant": variable.constant,
            }
            for variable in model.variables.filter(constant=True)
            .select_related("unit")
            .order_by("pk")
        ]

    groups = list(
        project.groups.order_by("pk").prefetch_related(
            Prefetch(
                "covariate_populations",
                queryset=CovariatePopulation.objects.select_related(
                    "covariate"
                ).order_by("pk"),
                to_attr="chat_covariate_populations",
            )
        )
    )
    protocols = list(
        project.protocols.select_related("amount_unit", "time_unit")
        .order_by("pk")
        .prefetch_related(
            Prefetch(
                "doses",
                queryset=Dose.objects.order_by("pk"),
                to_attr="chat_doses",
            )
        )
    )

    group_ids = {group.pk for group in groups}
    protocols_by_group = {group_id: [] for group_id in group_ids}
    ungrouped_protocols = []
    for protocol in protocols:
        if protocol.group_id in group_ids:
            protocols_by_group[protocol.group_id].append(protocol)
        else:
            ungrouped_protocols.append(protocol)

    if groups or protocols:
        context["trial_design"] = {
            "groups": [
                {
                    "name": group.name,
                    "subjects": group.study_size,
                    "age_range": [group.age_min, group.age_max],
                    "region": group.population_region,
                    "covariates": [
                        {
                            "name": population.covariate.name,
                            "median": population.median,
                        }
                        for population in group.chat_covariate_populations
                    ],
                    "protocols": [
                        _describe_protocol(protocol)
                        for protocol in protocols_by_group[group.pk]
                    ],
                }
                for group in groups
            ],
            "ungrouped_protocols": [
                _describe_protocol(protocol) for protocol in ungrouped_protocols
            ],
        }

    return context


def _get_model(project):
    # Use the first configured model.
    return (
        project.pk_models.select_related(
            "pk_model",
            "pk_model2",
            "pk_effect_model",
            "pd_model",
            "pd_model2",
        )
        .order_by("pk")
        .first()
    )


def _describe_protocol(protocol):
    return {
        "name": protocol.name,
        "route": protocol.get_dose_type_display(),
        "per_body_weight": protocol.amount_per_body_weight,
        "doses": [
            {
                "amount": dose.amount,
                "unit": (
                    protocol.amount_unit.symbol
                    if protocol.amount_unit is not None
                    else ""
                ),
                "start_time": dose.start_time,
                "time_unit": (
                    protocol.time_unit.symbol
                    if protocol.time_unit is not None
                    else ""
                ),
                "repeats": dose.repeats,
                "repeat_interval": dose.repeat_interval,
            }
            for dose in protocol.chat_doses
        ],
    }
