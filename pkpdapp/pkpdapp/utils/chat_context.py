#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.db.models import Prefetch

from pkpdapp.models import (
    Covariate,
    CovariatePopulation,
    Dose,
)
from pkpdapp.utils.lognormal import median_logvar_to_mean_std


def _round(value):
    """6 significant figures, matching the UI."""
    return float(f"{value:.6g}")


def build_chat_context(project):
    """Build the persisted, ORM-backed context supplied to the chatbot."""
    context = {
        "project": {
            "name": project.name,
            "description": project.description,
            # Display label, not the stored code, which defaults to "O".
            "species": project.get_species_display(),
        }
    }

    model = _get_model(project)
    if model is not None:
        context["model"] = {
            "name": model.name,
            # No has_saturation/has_effect (v2-only) or has_extravascular
            # (never set): they are always False on a v3 project.
            "has_lag": model.has_lag,
            "has_hill_coefficient": model.has_hill_coefficient,
            "pk_model_name": (
                model.pk_model.name if model.pk_model is not None else None
            ),
            "pk_model_extravascular": (
                model.pk_model2.name if model.pk_model2 is not None else None
            ),
            "pk_effect_model": (
                model.pk_effect_model.name
                if model.pk_effect_model is not None
                else None
            ),
            "number_of_effect_compartments": (
                model.number_of_effect_compartments
            ),
            "has_anti_drug_antibodies": model.has_anti_drug_antibodies,
            "has_bioavailability": model.has_bioavailability,
            "pd_model_name": (
                model.pd_model.name if model.pd_model is not None else None
            ),
            "pd_model2": (
                model.pd_model2.name if model.pd_model2 is not None else None
            ),
            # No mmt: too large, and its literals are library placeholders
            # that contradict the parameter values. Fetched on demand via
            # get_current_model_definition. No time_max: the assistant
            # cannot simulate.
        }
        context["variables"] = [
            {
                "name": _parameter_name(
                    variable, model.number_of_effect_compartments
                ),
                "qname": variable.qname,
                # get_default_value() un-logs; default_value is the log.
                "value": variable.get_default_value(),
                "unit": (
                    variable.unit.symbol
                    if variable.unit is not None
                    else variable.unit_symbol
                ),
                "constant": variable.constant,
                "description": variable.description,
                "is_log": variable.is_log,
            }
            for variable in model.variables.filter(constant=True)
            .select_related("unit")
            .order_by("pk")
            if _is_user_parameter(variable)
        ]

    groups = list(
        project.groups.order_by("pk").prefetch_related(
            Prefetch(
                "covariate_populations",
                queryset=CovariatePopulation.objects.select_related(
                    "covariate", "covariate__unit"
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
                queryset=Dose.objects.filter(
                    protocol__dataset__isnull=True
                ).order_by("pk"),
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
                _describe_group(group, protocols_by_group[group.pk])
                for group in groups
            ],
            "ungrouped_protocols": [
                _describe_protocol(protocol) for protocol in ungrouped_protocols
            ],
        }

    return context


def _parameter_name(variable, effect_compartments):
    """The name shown in the UI, which numbers repeated effect compartments."""
    # Mirrors parameterDisplayName in the frontend.
    prefix = "EffectCompartment"
    if effect_compartments > 1 and variable.qname.startswith("Effect"):
        compartment = variable.qname.split(".")[0]
        return f"{variable.name}_Ce{compartment[len(prefix):]}"
    return variable.name


def _is_user_parameter(variable):
    """Covariate inputs and medians are machinery; coefficients are editable."""
    # Mirrors getConstVariables in the frontend: AGE/SEX/WT/COV_<id> and
    # mu_<cov> are set at simulate time, <param>_a_<cov> and _d_<cov>_<k>
    # are the coefficients the user edits.
    if not variable.qname.startswith("Covariates."):
        return True
    return "_a_" in variable.name or "_d_" in variable.name


def _describe_group(group, protocols):
    described = {
        "name": group.name,
        "covariates": [
            _describe_covariate_population(population)
            for population in group.chat_covariate_populations
        ],
        "protocols": [_describe_protocol(protocol) for protocol in protocols],
    }
    if group.dataset_id is None:
        described["subjects"] = group.study_size
        described["age_range"] = [group.age_min, group.age_max]
        described["region"] = group.get_population_region_display()
        # Only route into the prompt for the built-in weight/age/sex
        # covariates, which have no CovariatePopulation row.
        described["male_fraction"] = group.m2f_ratio
    else:
        # Dataset imports never set study_size/age/region, so those hold
        # model defaults (200/20/60/EU) rather than anything the user chose.
        described["from_dataset"] = True
        described["subjects"] = group.subjects.count()
    return described


def _describe_covariate_population(population):
    # Every row carries both median/variance and category_probabilities, so
    # branch on the type rather than reporting the meaningless one.
    covariate = population.covariate
    described = {"name": covariate.name}

    if covariate.type == Covariate.Type.CATEGORICAL:
        probabilities = population.category_probabilities or []
        names = covariate.category_names or []
        described["categories"] = [
            {
                "name": (
                    names[index] if index < len(names) else f"category {index}"
                ),
                "probability": probability,
            }
            for index, probability in enumerate(probabilities)
        ]
    else:
        # The DB stores a log-normal median; the UI shows mean/std.
        mean, std = median_logvar_to_mean_std(
            population.median, population.variance
        )
        described["mean"] = _round(mean)
        described["std"] = _round(std)
        if covariate.unit is not None:
            described["unit"] = covariate.unit.symbol
    return described


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
    described = {
        "name": protocol.name,
        "route": protocol.get_dose_type_display(),
        "per_body_weight": protocol.amount_per_body_weight,
    }
    if protocol.dataset_id is not None:
        # A dataset import creates one dose per subject per visit, so this
        # list is unbounded and is really dataset contents.
        described["from_dataset"] = True
        return described

    described["doses"] = [
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
            # Distinguishes a bolus from an infusion; in time_unit.
            "duration": dose.duration,
            "repeats": dose.repeats,
            "repeat_interval": dose.repeat_interval,
        }
        for dose in protocol.chat_doses
    ]
    return described
