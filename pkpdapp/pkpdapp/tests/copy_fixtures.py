#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
# A "maximal" project used by the Project.copy round-trip tests: every model
# that Project.copy handles has at least one row, and every field that copy
# is expected to carry over is set to a non-default value.
#
import datetime

from django.contrib.auth.models import User
from django.utils import timezone

from pkpdapp.models import (
    Biomarker,
    BiomarkerType,
    CategoricalBiomarker,
    CombinedModel,
    Compound,
    Correlation,
    Covariate,
    CovariatePopulation,
    Dataset,
    DerivedVariable,
    Distribution,
    EfficacyExperiment,
    PharmacodynamicModel,
    PharmacokineticModel,
    PkpdMapping,
    Project,
    ProjectAccess,
    Protocol,
    ResultsTable,
    Simulation,
    SimulationCxLine,
    SimulationPlot,
    SimulationSlider,
    SimulationYAxis,
    Subject,
    SubjectGroup,
    Tag,
    TimeInterval,
    Unit,
)

# values that are not valid "differs from the default" candidates and need a
# specific value instead (e.g. fields with validators)
SCALAR_OVERRIDES = {
    ("SubjectGroup", "m2f_ratio"): 0.35,
    ("Correlation", "coefficient"): 0.45,
    ("Distribution", "variance"): 0.7,
}


def _is_unset(obj, field):
    """True if ``field`` still has its default (or empty) value on ``obj``."""
    value = getattr(obj, field.attname)
    if value is None or value == "":
        return True
    if field.has_default():
        return value == field.get_default()
    return False


def _different_unit(current_id, offset):
    """
    A unit different from ``current_id``. If there is a current unit the new one
    has the same dimension (so model building and conversions stay valid).
    """
    if current_id is not None:
        compatible = [
            u for u in Unit.objects.get(pk=current_id).get_compatible_units()
            if u.pk != current_id
        ]
        if compatible:
            return compatible[offset % len(compatible)]
        raise RuntimeError(f"no unit compatible with unit {current_id}")
    return Unit.objects.order_by("pk")[offset]


def _distinct_scalar(model_name, field, counter):
    """A valid value for ``field`` that differs from its default."""
    override = SCALAR_OVERRIDES.get((model_name, field.name))
    if override is not None:
        return override
    kind = field.get_internal_type()
    default = field.get_default() if field.has_default() else None
    if field.choices:
        values = [c[0] for c in field.choices]
        others = [v for v in values if v != default]
        return others[-1]
    if kind == "BooleanField":
        return not bool(default)
    if kind in ("FloatField",):
        return (default or 0.0) + 3.5 + 0.125 * counter
    if kind in ("IntegerField", "PositiveIntegerField"):
        return int(default or 0) + 3 + counter
    if kind in ("CharField", "TextField"):
        text = f"{model_name}.{field.name}"
        if field.max_length:
            text = text[: field.max_length]
        return text
    if kind == "DateTimeField":
        return datetime.datetime(2024, 5, 6, 7, 8, 9, tzinfo=datetime.timezone.utc)
    return None


def fill_unset_fields(obj, skip=(), counter=0):
    """
    Give every field of ``obj`` that is still at its default a distinct value.

    Only plain scalar fields and foreign keys to ``Unit`` are touched. Other
    relations and JSON fields have to be set explicitly by the fixture.
    """
    model_name = type(obj).__name__
    changed = False
    for field in obj._meta.concrete_fields:
        if field.primary_key or field.name in skip or field.auto_created:
            continue
        if field.name in ("read_only", "datetime") and model_name != "Dataset":
            continue
        if field.is_relation:
            if field.related_model is Unit and _is_unset(obj, field):
                setattr(obj, field.name, _different_unit(
                    getattr(obj, field.attname), counter + 1))
                changed = True
            continue
        if field.get_internal_type() == "JSONField":
            continue
        if not _is_unset(obj, field):
            continue
        value = _distinct_scalar(model_name, field, counter)
        if value is not None:
            setattr(obj, field.name, value)
            changed = True
    if changed:
        obj.save()
    return obj


def build_maximal_project():
    """
    Build a project in which every copied model has rows with non-default
    values. Returns the project.
    """
    user = User.objects.create_user(username="copy_owner", password="x")
    h = Unit.objects.get(symbol="h")
    mg = Unit.objects.get(symbol="mg")
    kg = Unit.objects.get(symbol="kg")

    # --- compound and efficacy experiments
    compound = Compound.objects.create(name="demo", compound_type="LM")
    fill_unset_fields(compound, skip=("use_efficacy",))
    efficacy = EfficacyExperiment.objects.create(
        name="efficacy experiment", c50=2.0, c50_unit=h, compound=compound,
        hill_coefficient=2.5,
    )
    compound.use_efficacy = efficacy
    compound.save()
    EfficacyExperiment.objects.create(
        name="other efficacy experiment", c50=3.0, c50_unit=h, compound=compound,
    )

    # --- project
    project = Project.objects.create(
        name="demo",
        compound=compound,
        description="a described project",
        tags="a,b",
        species=Project.Species.RAT,
        species_weight=0.25,
        species_weight_unit=Unit.objects.get(symbol="g"),
        version=7,
    )
    fill_unset_fields(project)
    project.pk_tags.set([Tag.objects.create(name="pk tag")])
    project.pd_tags.set([Tag.objects.create(name="pd tag")])
    ProjectAccess.objects.create(user=user, project=project, read_only=True)

    # --- PKPD model
    pkpd_model = CombinedModel.objects.create(
        name="my wonderful model",
        pk_model=PharmacokineticModel.objects.get(name="1-compartmental model"),
        pk_model2=PharmacokineticModel.objects.get(
            name="First order absorption model"
        ),
        pd_model=PharmacodynamicModel.objects.get(
            name="indirect_effects_stimulation_production"
        ),
        project=project,
        number_of_effect_compartments=1,
        time_max=45.0,
        species="R",
        has_extravascular=True,
        has_effect=True,
        has_lag=True,
        has_bioavailability=True,
        has_saturation=True,
    )
    def var(qname):
        # structural changes (mappings, derived variables) rebuild the model's
        # variables, so always look them up fresh
        return pkpd_model.variables.get(qname=qname)

    # --- covariates
    continuous = Covariate.objects.create(
        project=project, name="albumin", type=Covariate.Type.CONTINUOUS,
        unit=kg, reference_value=4.5,
    )
    categorical = Covariate.objects.create(
        project=project, name="sex", type=Covariate.Type.CATEGORICAL,
        builtin=Covariate.Builtin.SEX, n_categories=2,
        category_names=["F", "M"],
    )
    DerivedVariable.objects.create(
        pkpd_model=pkpd_model, pk_variable=var("PKCompartment.V1"),
        covariate=continuous,
        type=DerivedVariable.Type.CUSTOM_CONT_COVARIATE,
    )
    DerivedVariable.objects.create(
        pkpd_model=pkpd_model, pk_variable=var("PKCompartment.CL"),
        secondary_variable=var("PKCompartment.C1"),
        type=DerivedVariable.Type.EXTENDED_MICHAELIS_MENTEN,
    )
    PkpdMapping.objects.create(
        pkpd_model=pkpd_model, pk_variable=var("PKCompartment.C1"),
        pd_variable=var("PDCompartment.C_Drug"))
    TimeInterval.objects.create(pkpd_model=pkpd_model, start_time=1.0,
                                end_time=9.0, unit=h)
    c_drug_pd = var("PDCompartment.C_Drug")
    a1 = var("PKCompartment.A1")
    cl = var("PKCompartment.CL")
    v1 = var("PKCompartment.V1")

    # --- distributions and correlation (on model variables)
    d1 = Distribution.objects.create(
        variable=cl, pdf=Distribution.PDF.LOGNORMAL, variance=0.7)
    d2 = Distribution.objects.create(
        variable=v1, pdf=Distribution.PDF.NORMAL, variance=0.2)
    Correlation.objects.create(distribution_1=d1, distribution_2=d2,
                               coefficient=0.45)

    # --- dataset, groups, subjects
    dataset = Dataset.objects.create(name="my dataset", project=project,
                                     description="a dataset")
    fill_unset_fields(dataset)
    dataset_group = SubjectGroup.objects.create(
        name="Group 1", id_in_dataset="1", dataset=dataset, project=project)
    fill_unset_fields(dataset_group)
    project_group = SubjectGroup.objects.create(
        name="Sim-Group 1", project=project)
    fill_unset_fields(project_group, counter=1)
    subject = Subject.objects.create(
        id_in_dataset=1, dataset=dataset, group=dataset_group,
        metadata={"weight": 70})
    fill_unset_fields(subject)
    subject_no_group = Subject.objects.create(id_in_dataset=2, dataset=dataset)

    CovariatePopulation.objects.create(
        subject_group=dataset_group, covariate=continuous, median=42.0,
        variance=0.16)
    CovariatePopulation.objects.create(
        subject_group=project_group, covariate=categorical,
        category_probabilities=[0.4, 0.6])

    # --- protocols and doses
    protocol = Protocol.objects.create(
        name="my protocol", variable=c_drug_pd, dataset=dataset,
        group=dataset_group, project=project, compound=compound,
        dose_type=Protocol.DoseType.INDIRECT)
    fill_unset_fields(protocol)
    protocol_no_dataset = Protocol.objects.create(
        name="my protocol without dataset", variable=c_drug_pd, project=project,
        group=project_group, dose_type=Protocol.DoseType.INDIRECT)
    fill_unset_fields(protocol_no_dataset, counter=1)
    subject.protocol = protocol
    subject.save()
    for p, amount in ((protocol, 1.0), (protocol_no_dataset, 2.0)):
        dose = p.doses.create(amount=amount, start_time=0.5, repeats=2,
                              repeat_interval=1.1, duration=0.3)
        fill_unset_fields(dose)

    # --- biomarkers
    biomarker_type = BiomarkerType.objects.create(
        name="my biomarker type", stored_unit=mg, display_unit=mg,
        stored_time_unit=h, display_time_unit=h, dataset=dataset,
        variable=c_drug_pd, description="a biomarker type", display=False,
        color=3, axis=True)
    categorical_type = BiomarkerType.objects.create(
        name="my categorical type", stored_unit=mg, display_unit=mg,
        stored_time_unit=h, display_time_unit=h, dataset=dataset,
        variable=a1)
    Biomarker.objects.create(time=1.0, subject=subject,
                             biomarker_type=biomarker_type, value=42.0,
                             exclude=True)
    Biomarker.objects.create(time=2.0, subject=subject_no_group,
                             biomarker_type=biomarker_type, value=43.0)
    CategoricalBiomarker.objects.create(
        time=0.0, subject=subject, biomarker_type=categorical_type,
        value="F")

    # --- variables: give every scalar a non-default value
    # (is_log has a CHECK constraint tying it to lower_bound, and constant/state
    # are structural -- derived from the model definition -- so leave those)
    for i, variable in enumerate(pkpd_model.variables.all()):
        if variable.qname.startswith("Covariates."):
            # rebuilt from the covariate on copy; only values/bounds carry over
            continue
        fill_unset_fields(
            variable, skip=("is_log", "constant", "state"), counter=i % 3)
    log_variable = var("PKCompartment.V1")
    log_variable.lower_bound = 0.5
    log_variable.upper_bound = 500.0
    log_variable.is_log = True
    log_variable.save()

    # --- results table
    ResultsTable.objects.create(
        name="my results table", rows=ResultsTable.Type.PARAMETERS,
        columns=ResultsTable.Type.GROUPS, filters={"dose_type": "IV"},
        project=project)

    # --- simulation
    sim = Simulation.objects.create(
        name="my simulation", project=project, time_max=40, time_max_unit=h,
        nrows=2, ncols=3, abs_tolerance=1e-5, rel_tolerance=1e-4)
    plot = SimulationPlot.objects.create(
        simulation=sim, index=0, x_unit=h, y_unit=mg, y_unit2=mg,
        x_scale="ln", y_scale="lg2", y2_scale="lg10", x_label="x", y_label="y",
        y2_label="y2", min=0.1, max=9.0, min2=0.2, max2=8.0)
    SimulationYAxis.objects.create(plot=plot, variable=a1, right=True)
    SimulationSlider.objects.create(simulation=sim, variable=cl)
    SimulationCxLine.objects.create(plot=plot, value=1.5)

    project.refresh_from_db()
    return project
