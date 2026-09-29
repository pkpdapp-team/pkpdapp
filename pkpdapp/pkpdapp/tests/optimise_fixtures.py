#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
# Shared fixtures and helpers for optimise tests (test_models and test_views).
#

import numpy as np

from pkpdapp.models import (
    Biomarker,
    BiomarkerType,
    CombinedModel,
    Compound,
    Dataset,
    DerivedVariable,
    Dose,
    PharmacodynamicModel,
    PharmacokineticModel,
    Project,
    Protocol,
    Subject,
    SubjectGroup,
    Unit,
    Variable,
)

TRUE_K = 0.22
TRUE_SCALE = 1.7

DOSE_SPECS = [
    [(0.0, 10.0), (5.0, 4.0)],
    [(0.0, 7.0), (8.0, 6.0)],
]

SELECTED_TIMES = np.asarray(
    [0.5, 1.5, 3.0, 4.5, 5.5, 6.5, 8.5, 10.0, 12.0, 14.0],
    dtype=float,
)


def exponential_response(times, doses, k, scale):
    """Analytical response of a bolus-dosed exponential decay model."""
    amount = np.zeros_like(times, dtype=float)
    duration = 0.1
    for start_time, dose_amount in doses:
        rate = dose_amount / duration
        since_start = times - start_time
        during = (since_start >= 0) & (since_start <= duration)
        after = since_start > duration
        amount[during] += (rate / k) * (1 - np.exp(-k * since_start[during]))
        amount[after] += (
            (rate / k)
            * (1 - np.exp(-k * duration))
            * np.exp(-k * (since_start[after] - duration))
        )
    return scale * amount


def create_exponential_model(name_prefix="optimise"):
    """
    Create a CombinedModel representing two-parameter exponential decay.

    Returns (model, dataset).
    """
    compound = Compound.objects.create(name=f"{name_prefix} demo")
    project = Project.objects.create(name=f"{name_prefix} project", compound=compound)
    dataset = Dataset.objects.create(name=f"{name_prefix} dataset", project=project)

    mmt = f"""
[[model]]
Central.amount = 0

[environment]
t = 0 in [h] bind time

[Central]
k = {TRUE_K} in [1/h]
scale = {TRUE_SCALE} in [1/mg]
dot(amount) = -k * amount in [mg]
response = scale * amount in [dimensionless]
"""
    pd_model = PharmacodynamicModel.objects.create(
        name=f"{name_prefix} exponential decay",
        description="Two-parameter exponential decay test model",
        mmt=mmt,
        time_max=18,
        project=project,
    )
    model = CombinedModel.objects.create(
        name=f"{name_prefix} combined model",
        pd_model=pd_model,
        project=project,
        time_max=18,
    )
    return model, dataset


def create_exponential_data(
    name_prefix="optimise", group_name_prefix="Data", rng_seed=12345
):
    """
    Build a full optimise test fixture: model, dataset, groups, protocols,
    doses, biomarker type and noisy observed biomarkers.

    Returns a dict with keys:
        model, dataset, biomarker_type, groups, inputs, true, plot_data
    where plot_data is a list of
        (group_name, sim_times, sim_values, selected_times, observed_values)
    """
    model, dataset = create_exponential_model(name_prefix)
    project = model.project

    amount = model.variables.get(qname="Central.amount")
    response = model.variables.get(qname="Central.response")
    k = model.variables.get(qname="Central.k")
    scale = model.variables.get(qname="Central.scale")

    h = Unit.objects.get(symbol="h")
    mg = Unit.objects.get(symbol="mg")
    dimensionless = Unit.objects.get(symbol="")

    biomarker_type = BiomarkerType.objects.create(
        name="response",
        dataset=dataset,
        stored_unit=dimensionless,
        display_unit=dimensionless,
        stored_time_unit=h,
        display_time_unit=h,
        variable=response,
    )

    # every project has a base "Sim-Group 1" project group (created by
    # ProjectSerializer.create in production). This fixture builds the project
    # directly, so create it here to mirror production. It is not part of the
    # returned data groups (it has no subjects and isn't an optimisation group).
    SubjectGroup.objects.create(
        name="Sim-Group 1",
        project=project,
        dataset=None,
    )

    groups = [
        SubjectGroup.objects.create(
            name=f"{group_name_prefix}-Group {i}",
            id_in_dataset=str(i),
            dataset=dataset,
            project=project,
        )
        for i in range(1, len(DOSE_SPECS) + 1)
    ]

    for index, (group, doses) in enumerate(zip(groups, DOSE_SPECS), start=1):
        Subject.objects.create(
            id_in_dataset=index,
            dataset=dataset,
            group=group,
        )
        protocol = Protocol.objects.create(
            name=f"{group.name} protocol",
            dataset=dataset,
            project=project,
            time_unit=h,
            amount_unit=mg,
            dose_type=Protocol.DoseType.DIRECT,
            variable=amount,
            group=group,
        )
        for start_time, dose_amount in doses:
            Dose.objects.create(
                protocol=protocol,
                start_time=start_time,
                duration=0.1,
                amount=dose_amount,
            )

    rng = np.random.default_rng(rng_seed)
    plot_data = []
    for group, doses in zip(groups, DOSE_SPECS):
        subject = group.subjects.first()
        sim_times = np.linspace(0, 18, 200)
        sim_values = exponential_response(sim_times, doses, TRUE_K, TRUE_SCALE)
        selected_values = exponential_response(
            SELECTED_TIMES, doses, TRUE_K, TRUE_SCALE
        )
        noise = rng.normal(
            loc=0.0,
            scale=0.02 * np.maximum(selected_values, 1.0),
        )
        observed_values = np.maximum(selected_values + noise, 1e-6)
        for t, value in zip(SELECTED_TIMES, observed_values):
            Biomarker.objects.create(
                time=float(t),
                subject=subject,
                biomarker_type=biomarker_type,
                value=float(value),
            )
        plot_data.append(
            (group.name, sim_times, sim_values, SELECTED_TIMES, observed_values)
        )

    return {
        "model": model,
        "dataset": dataset,
        "biomarker_type": biomarker_type,
        "groups": groups,
        "inputs": [k, scale],
        "true": [TRUE_K, TRUE_SCALE],
        "plot_data": plot_data,
    }


# Observed central-compartment concentrations for the Dose Emax fixture. The
# exact values are unimportant: the fixture exists to reproduce a non-finite
# starting loss, so we only need finite, positive observations at a few times.
DOSE_EMAX_TIMES = np.asarray([0.5, 1.0, 2.0, 4.0, 8.0, 12.0, 24.0], dtype=float)
DOSE_EMAX_VALUES = np.asarray([80.0, 70.0, 55.0, 35.0, 18.0, 9.0, 2.5], dtype=float)


def create_dose_emax_data(name_prefix="dose_emax"):
    """
    A *library* one-compartment PK model with a Dose Emax (EMX) nonlinearity on
    clearance, a dosing protocol with a single dose, and observed central
    compartment concentrations.

    Returns a dict with keys: model, dataset, biomarker_type, groups, inputs,
    starting, bounds.
    """
    compound = Compound.objects.create(name=f"{name_prefix} demo")
    project = Project.objects.create(name=f"{name_prefix} project", compound=compound)
    dataset = Dataset.objects.create(name=f"{name_prefix} dataset", project=project)

    pk_model = PharmacokineticModel.objects.get(name="one_compartment_clinical")
    assert pk_model.is_library_model
    model = CombinedModel.objects.create(
        name=f"{name_prefix} combined model",
        pk_model=pk_model,
        project=project,
    )

    h = Unit.objects.get(symbol="h")
    mg = Unit.objects.get(symbol="mg")

    # mirror production's base "Sim-Group 1" project group (see the exponential
    # fixture); it has no subjects and is not an optimisation group.
    SubjectGroup.objects.create(name="Sim-Group 1", project=project, dataset=None)

    group = SubjectGroup.objects.create(
        name=f"{name_prefix} group",
        id_in_dataset="1",
        dataset=dataset,
        project=project,
    )
    subject = Subject.objects.create(id_in_dataset=1, dataset=dataset, group=group)

    # The dosing protocol must exist *before* the Dose Emax derived variable is
    # created: add_emax reads project.protocols.first() at model-build time and
    # returns None (creating no C_Drug) if there is no dose yet.
    dose_var = Variable.objects.get(qname="PKCompartment.A1", dosed_pk_model=model)
    protocol = Protocol.objects.create(
        name=f"{name_prefix} protocol",
        dataset=dataset,
        project=project,
        compound=compound,
        time_unit=h,
        amount_unit=mg,
        dose_type=Protocol.DoseType.DIRECT,
        variable=dose_var,
        group=group,
    )
    Dose.objects.create(
        protocol=protocol,
        start_time=0.0,
        duration=0.1,
        amount=100.0,
    )

    # Dose Emax nonlinearity on clearance -> creates PKNonlinearities.C_Drug.
    DerivedVariable.objects.create(
        pkpd_model=model,
        pk_variable=model.variables.get(qname="PKCompartment.CL"),
        type=DerivedVariable.Type.EMAX,
    )
    # Re-fetch so the model / variable cache reflects the new derived variable.
    model = CombinedModel.objects.get(pk=model.pk)

    c1 = model.variables.get(qname="PKCompartment.C1")
    cl = model.variables.get(qname="PKCompartment.CL")
    v1 = model.variables.get(qname="PKCompartment.V1")

    biomarker_type = BiomarkerType.objects.create(
        name="central concentration",
        dataset=dataset,
        stored_unit=c1.unit,
        display_unit=c1.unit,
        stored_time_unit=h,
        display_time_unit=h,
        variable=c1,
    )

    for t, value in zip(DOSE_EMAX_TIMES, DOSE_EMAX_VALUES):
        Biomarker.objects.create(
            time=float(t),
            subject=subject,
            biomarker_type=biomarker_type,
            value=float(value),
        )

    return {
        "model": model,
        "dataset": dataset,
        "biomarker_type": biomarker_type,
        "groups": [group],
        "inputs": [cl, v1],
        "starting": [1.0, 1.0],
        "bounds": ([0.1, 0.1], [10.0, 10.0]),
    }
