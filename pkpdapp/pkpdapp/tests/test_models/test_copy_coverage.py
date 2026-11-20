#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
"""
Guards that fail whenever the database schema changes without a conscious
decision about ``Project.copy``.

``COPY_REGISTRY`` lists every model reachable from ``Project`` and, for each
model that has a ``copy()`` method, the fields that are *deliberately* not
copied (with a reason). Every other concrete field must be mentioned in the
source of ``copy()``.

When this test fails after you add a field to a model:
  * if the field should be copied, add it to that model's ``copy()``;
  * if not, add it to the model's entry below, with a reason.
"""
import inspect
import re

from django.test import SimpleTestCase

from pkpdapp import models as m
from pkpdapp.models import Project

# fields that never need copying, whatever the model
COMMON_EXCLUDED = {
    "id": "primary key",
}

# model -> {field: reason it is not copied}
COPY_REGISTRY = {
    m.Project: {
        "users": "copied via ProjectAccess.copy",
        "created": "set to now for the new project",
    },
    m.ProjectAccess: {"user": "passed through ProjectAccess.copy(project)"},
    m.ResultsTable: {"project": "set to new project"},
    m.Covariate: {"project": "set to new project"},
    m.CovariatePopulation: {},
    m.DerivedVariable: {
        "read_only": "copies start writable; read_only is not carried over",
        "datetime": "auto timestamp",
        "pkpd_model": "set to new model",
    },
    m.SubjectGroup: {"project": "set to new project", "dataset": "set to new dataset"},
    m.Protocol: {
        "read_only": "copies start writable; read_only is not carried over",
        "datetime": "auto timestamp",
        "project": "set to new project",
        "dataset": "set to new dataset",
    },
    m.Dose: {
        "read_only": "copies start writable; read_only is not carried over",
        "datetime": "auto timestamp",
        "protocol": "set to new protocol",
    },
    m.Subject: {"dataset": "set to new dataset", "protocol": "linked in Protocol.copy"},
    m.Biomarker: {"subject": "mapped to new subject"},
    m.CombinedModel: {
        "read_only": "copies start writable; read_only is not carried over",
        "datetime": "auto timestamp",
        "project": "set to new project",
    },
    m.PkpdMapping: {
        "read_only": "copies start writable; read_only is not carried over",
        "datetime": "auto timestamp",
        "pkpd_model": "set to new model",
    },
    m.TimeInterval: {
        "read_only": "copies start writable; read_only is not carried over",
        "datetime": "auto timestamp",
        "pkpd_model": "set to new model",
    },
    m.Variable: {
        "read_only": "copies start writable; read_only is not carried over",
        "datetime": "auto timestamp",
        "pd_model": "set when the new model is built",
        "pk_model": "set when the new model is built",
        "dosed_pk_model": "set when the new model is built",
        "qname": "identifies the variable; fixed at creation",
    },
    m.BiomarkerType: {"dataset": "set to new dataset"},
    m.CategoricalBiomarker: {"subject": "mapped to new subject"},
    m.Distribution: {
        "read_only": "copies start writable; read_only is not carried over",
        "datetime": "auto timestamp",
        "correlations": "copied separately (CombinedModel.copy)",
        "variable": "set to new variable",
    },
    m.Correlation: {
        "read_only": "copies start writable; read_only is not carried over",
        "distribution_1": "mapped to new distribution",
        "distribution_2": "mapped to new distribution",
        "datetime": "auto timestamp",
    },
    m.SimulationYAxis: {"plot": "set to new plot"},
    m.SimulationSlider: {"simulation": "set to new simulation"},
    m.Dataset: {"project": "set to new project"},
    m.Simulation: {"project": "set to new project"},
    m.SimulationPlot: {"simulation": "set to new simulation"},
    m.SimulationCxLine: {"plot": "set to new plot"},
    m.Compound: {},
    m.EfficacyExperiment: {"compound": "set to new compound"},
}

# models reachable from Project that are deliberately not copied
NOT_COPIED = {
    m.Conversation: "chat history is per user/project and not duplicated",
    m.Message: "chat history is per user/project and not duplicated",
    m.PharmacodynamicModel: "library model referenced by CombinedModel, not copied",
    m.Document: "shared library documents and project uploads are not duplicated",
}


def reachable_models():
    """Every model reachable from Project through reverse relations."""
    seen = set()

    def walk(model):
        if model in seen:
            return
        seen.add(model)
        for f in model._meta.get_fields():
            if f.auto_created and not f.concrete and (f.one_to_many or f.one_to_one):
                walk(f.related_model)

    walk(Project)
    return seen


def copyable_fields(model):
    return [
        f.name
        for f in model._meta.get_fields()
        if (f.concrete or f.many_to_many) and not f.auto_created
        or f.name == "id"
    ]


def copy_source(model):
    # Project.copy is a thin atomic wrapper around Project._copy
    parts = [model.copy, getattr(model, "_copy", None)]
    return "\n".join(inspect.getsource(f) for f in parts if f is not None)


class TestCopyCoverage(SimpleTestCase):
    def test_every_reachable_model_is_classified(self):
        classified = set(COPY_REGISTRY) | set(NOT_COPIED)
        missing = sorted(
            model.__name__ for model in reachable_models() if model not in classified
        )
        self.assertEqual(
            missing,
            [],
            "New model(s) reachable from Project are neither copied nor listed "
            "in NOT_COPIED in test_copy_coverage.py: %s" % missing,
        )

    def test_registry_models_have_copy_methods(self):
        for model in COPY_REGISTRY:
            self.assertTrue(
                callable(getattr(model, "copy", None)),
                f"{model.__name__} has no copy() method",
            )

    def test_registry_has_no_stale_exclusions(self):
        for model, excluded in COPY_REGISTRY.items():
            names = set(copyable_fields(model))
            stale = set(excluded) - names
            self.assertFalse(
                stale, f"{model.__name__}: excluded fields no longer exist: {stale}"
            )

    def test_every_field_is_copied_or_excluded(self):
        problems = []
        for model, excluded in COPY_REGISTRY.items():
            source = copy_source(model)
            skip = set(excluded) | set(COMMON_EXCLUDED)
            for name in copyable_fields(model):
                if name in skip:
                    continue
                if not re.search(rf"\b{re.escape(name)}\b", source):
                    problems.append(f"{model.__name__}.{name}")
        self.assertEqual(
            problems,
            [],
            "Fields not handled by copy() and not listed as excluded in "
            "COPY_REGISTRY (test_copy_coverage.py): %s" % problems,
        )
