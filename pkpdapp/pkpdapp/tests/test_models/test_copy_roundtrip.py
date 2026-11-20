#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
"""
Round-trip test for ``Project.copy``.

A maximal project (see ``tests/copy_fixtures.py``) is copied, then every row of
every copied model is compared field by field with its counterpart in the copy.
Fields listed in ``COPY_REGISTRY`` (test_copy_coverage.py) are the deliberate
exceptions. Foreign keys to other per-project rows are compared by natural
key *and* must point inside the same project, so a copy that still references
the original project's rows fails.
"""
import re

from django.test import TestCase

from pkpdapp import models as m
from pkpdapp.tests.copy_fixtures import build_maximal_project
from pkpdapp.tests.test_models.test_copy_coverage import COMMON_EXCLUDED, COPY_REGISTRY


def _cov(qname):
    # covariate variables are named after the covariate id, which differs
    return re.sub(r"COV_\d+", "COV_n", qname)


def _cov_text(text):
    return re.sub(r"COV_\d+", "COV_n", text)


def _vkey(v):
    owner = v.dosed_pk_model
    return (owner.name, _cov(v.qname))


# model -> (scope(project) -> list of rows, key(row) -> hashable)
SCOPE = {
    m.Project: (lambda p: [p], lambda o: "project"),
    m.ProjectAccess: (lambda p: list(p.projectaccess_set.all()),
                      lambda o: o.user.username),
    m.Compound: (lambda p: [p.compound], lambda o: o.name),
    m.EfficacyExperiment: (lambda p: list(p.compound.efficacy_experiments.all()),
                           lambda o: o.name),
    m.Dataset: (lambda p: list(p.datasets.all()), lambda o: o.name),
    m.SubjectGroup: (lambda p: list(p.groups.all()), lambda o: o.name),
    m.Subject: (lambda p: list(m.Subject.objects.filter(dataset__project=p)),
                lambda o: o.id_in_dataset),
    m.BiomarkerType: (
        lambda p: list(m.BiomarkerType.objects.filter(dataset__project=p)),
        lambda o: o.name),
    m.Biomarker: (
        lambda p: list(m.Biomarker.objects.filter(subject__dataset__project=p)),
        lambda o: (o.biomarker_type.name, o.subject.id_in_dataset, o.time)),
    m.CategoricalBiomarker: (
        lambda p: list(
            m.CategoricalBiomarker.objects.filter(subject__dataset__project=p)),
        lambda o: (o.biomarker_type.name, o.subject.id_in_dataset, o.time)),
    m.Protocol: (lambda p: list(p.protocols.all()), lambda o: o.name),
    m.Dose: (lambda p: list(m.Dose.objects.filter(protocol__project=p)),
             lambda o: (o.protocol.name, o.amount)),
    m.CombinedModel: (lambda p: list(p.pk_models.all()), lambda o: o.name),
    m.Variable: (
        lambda p: [v for mod in p.pk_models.all() for v in mod.variables.all()],
        _vkey),
    m.PkpdMapping: (
        lambda p: [x for mod in p.pk_models.all() for x in mod.mappings.all()],
        lambda o: (_vkey(o.pk_variable), _vkey(o.pd_variable))),
    m.TimeInterval: (
        lambda p: [x for mod in p.pk_models.all()
                   for x in mod.time_intervals.all()],
        lambda o: o.start_time),
    m.DerivedVariable: (
        lambda p: [x for mod in p.pk_models.all()
                   for x in mod.derived_variables.all()],
        lambda o: (o.type, _vkey(o.pk_variable))),
    m.Distribution: (
        lambda p: [v.distribution for mod in p.pk_models.all()
                   for v in mod.variables.all() if hasattr(v, "distribution")],
        lambda o: _vkey(o.variable)),
    m.Correlation: (
        lambda p: list({
            c.pk: c for mod in p.pk_models.all() for v in mod.variables.all()
            if hasattr(v, "distribution")
            for c in v.distribution.get_correlations()
        }.values()),
        lambda o: tuple(sorted([_vkey(o.distribution_1.variable),
                                _vkey(o.distribution_2.variable)]))),
    m.Covariate: (lambda p: list(p.covariates.all()), lambda o: o.name),
    m.CovariatePopulation: (
        lambda p: list(m.CovariatePopulation.objects.filter(covariate__project=p)),
        lambda o: (o.subject_group.name, o.covariate.name)),
    m.ResultsTable: (lambda p: list(p.results.all()), lambda o: o.name),
    m.Simulation: (lambda p: list(p.simulations.all()), lambda o: o.name),
    m.SimulationPlot: (
        lambda p: [x for s in p.simulations.all() for x in s.plots.all()],
        lambda o: (o.simulation.name, o.index)),
    m.SimulationYAxis: (
        lambda p: [y for s in p.simulations.all() for pl in s.plots.all()
                   for y in pl.y_axes.all()],
        lambda o: (o.plot.simulation.name, o.plot.index, _vkey(o.variable))),
    m.SimulationSlider: (
        lambda p: [x for s in p.simulations.all() for x in s.sliders.all()],
        lambda o: (o.simulation.name, _vkey(o.variable))),
    m.SimulationCxLine: (
        lambda p: [x for s in p.simulations.all() for pl in s.plots.all()
                   for x in pl.cx_lines.all()],
        lambda o: (o.plot.simulation.name, o.plot.index, o.value)),
}

# fields whose value legitimately differs between original and copy
EXPECTED_CHANGES = {
    (m.Project, "name"): lambda v: f"Copy of {v}",
}

# fields allowed to still be at their default in the maximal project (with
# the reason), e.g. because the fixture cannot set them independently
ALLOWED_AT_DEFAULT = {
    (m.Variable, "lower_bound"): "derived from the model definition",
    (m.Variable, "upper_bound"): "derived from the model definition",
    (m.Variable, "lower_threshold"): "only set for some variables",
    (m.Variable, "upper_threshold"): "only set for some variables",
    (m.Variable, "binding"): "only set for some variables",
    (m.Variable, "unit_symbol"): "only set for some variables",
    (m.Variable, "description"): "only set for some variables",
    (m.Variable, "unit"): "set by the model definition",
    (m.Variable, "secondary_unit"): "only set for some variables",
    (m.Compound, "intrinsic_clearance"): "optional",
    (m.Compound, "dissociation_constant"): "optional",
    (m.SubjectGroup, "id_in_dataset"): "optional for project-level groups",
    (m.Covariate, "unit"): "set on one covariate",
    (m.DerivedVariable, "secondary_variable"): "set on one derived variable",
    (m.DerivedVariable, "covariate"): "set on one derived variable",
    (m.Protocol, "time_unit"): "optional",
    (m.Protocol, "amount_unit"): "optional",
    (m.Dataset, "datetime"): "set by auto_now",
    (m.BiomarkerType, "variable"): "set on all types",
}


def comparable_fields(model):
    excluded = set(COPY_REGISTRY[model]) | set(COMMON_EXCLUDED)
    return [
        f
        for f in model._meta.get_fields()
        if (f.concrete or f.many_to_many)
        and not f.auto_created
        and f.name not in excluded
    ]


class TestProjectCopyRoundTrip(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.project = build_maximal_project()
        cls.new_project = cls.project.copy()
        cls.scoped = {}
        for model, (scope, key) in SCOPE.items():
            old = scope(cls.project)
            new = scope(cls.new_project)
            cls.scoped[model] = (
                {key(o): o for o in old},
                {key(o): o for o in new},
            )

    def _fingerprint(self, obj, side):
        out = {}
        for field in comparable_fields(type(obj)):
            if field.many_to_many:
                out[field.name] = sorted(
                    getattr(obj, field.name).values_list("pk", flat=True)
                )
            elif field.is_relation:
                target = getattr(obj, field.name)
                rel = field.related_model
                if target is None:
                    out[field.name] = None
                elif rel in SCOPE:
                    _, key = SCOPE[rel]
                    out[field.name] = key(target)
                    inside = self.scoped[rel][side]
                    if target.pk not in {o.pk for o in inside.values()}:
                        out[field.name] = (
                            f"<{rel.__name__} {key(target)!r} is outside the "
                            f"{'original' if side == 0 else 'copied'} project>"
                        )
                else:
                    out[field.name] = target.pk
            else:
                value = getattr(obj, field.attname)
                if isinstance(value, str):
                    # covariate variables are named after the covariate id
                    value = _cov_text(value)
                out[field.name] = value
        return out

    def test_every_model_has_rows_in_the_fixture(self):
        for model in COPY_REGISTRY:
            self.assertIn(model, SCOPE, f"{model.__name__} has no SCOPE entry")
            old, _ = self.scoped[model]
            self.assertTrue(old, f"fixture has no {model.__name__} rows")

    def test_fixture_sets_every_copied_field(self):
        """Fail if the fixture leaves a copied field at its default value."""
        unset = []
        for model in COPY_REGISTRY:
            old, _ = self.scoped[model]
            for field in comparable_fields(model):
                if (model, field.name) in ALLOWED_AT_DEFAULT:
                    continue
                if field.many_to_many:
                    is_set = any(
                        getattr(o, field.name).exists() for o in old.values()
                    )
                else:
                    def differs(o):
                        value = getattr(o, field.attname)
                        if value is None or value in ("", [], {}):
                            return False
                        if field.has_default():
                            return value != field.get_default()
                        return True

                    is_set = any(differs(o) for o in old.values())
                if not is_set:
                    unset.append(f"{model.__name__}.{field.name}")
        self.assertEqual(
            unset,
            [],
            "The maximal project in tests/copy_fixtures.py leaves these fields "
            "at their default, so a copy() bug would go unnoticed. Set them "
            "in the fixture (or add to ALLOWED_AT_DEFAULT with a reason): "
            "%s" % unset,
        )

    def test_copy_matches_original(self):
        problems = []
        for model in COPY_REGISTRY:
            old, new = self.scoped[model]
            name = model.__name__
            if set(old) != set(new):
                problems.append(
                    f"{name}: rows differ. only in original: "
                    f"{sorted(map(str, set(old) - set(new)))}, only in copy: "
                    f"{sorted(map(str, set(new) - set(old)))}"
                )
                continue
            for key, old_obj in old.items():
                new_obj = new[key]
                if new_obj.pk == old_obj.pk and model is not m.ProjectAccess:
                    problems.append(f"{name} {key!r}: copy is the same row")
                want = self._fingerprint(old_obj, 0)
                got = self._fingerprint(new_obj, 1)
                for field_name, value in want.items():
                    change = EXPECTED_CHANGES.get((model, field_name))
                    if change:
                        value = change(value)
                    # M2M ids (tags) are shared library rows; same pks expected
                    if got[field_name] != value:
                        problems.append(
                            f"{name} {key!r}.{field_name}: "
                            f"original {value!r}, copy {got[field_name]!r}"
                        )
        self.assertEqual(problems, [], "\n" + "\n".join(problems))
