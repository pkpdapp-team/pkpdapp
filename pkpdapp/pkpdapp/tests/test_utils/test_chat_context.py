#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import math
from unittest import mock

import pkpdapp.tests  # noqa: F401
from django.test import TestCase

from pkpdapp.models import (
    CombinedModel,
    Compound,
    Covariate,
    CovariatePopulation,
    Dataset,
    Dose,
    Project,
    Protocol,
    Subject,
    SubjectGroup,
    Unit,
    Variable,
)
from pkpdapp.utils.chat_context import build_chat_context


class BuildChatContextTestCase(TestCase):
    """build_chat_context() is the producer of the dict the chatbot renders
    into its system prompt, so it is exercised against real ORM objects."""

    def setUp(self):
        self.compound = Compound.objects.create(name="demo")
        self.project = Project.objects.create(
            name="demo project",
            compound=self.compound,
            description="A demo study",
            species=Project.Species.HUMAN,
        )
        self.mg = Unit.objects.get(symbol="mg")
        self.hour = Unit.objects.get(symbol="h")

    def add_protocol(self, name, group=None, **kwargs):
        return Protocol.objects.create(
            name=name,
            project=self.project,
            group=group,
            amount_unit=self.mg,
            time_unit=self.hour,
            **kwargs,
        )

    def test_describes_the_project(self):
        context = build_chat_context(self.project)

        self.assertEqual(
            context["project"],
            {
                "name": "demo project",
                "description": "A demo study",
                # get_species_display(), so "Human" not the stored "H".
                "species": "Human",
            },
        )

    def test_variable_values_are_reported_on_the_natural_scale(self):
        # default_value stores log(value) when is_log is set.
        model = CombinedModel.objects.create(
            name="combined", project=self.project
        )
        litres_per_hour = Unit.objects.get(symbol="L/h")
        Variable.objects.create(
            name="CL",
            qname="PKCompartment.CL",
            dosed_pk_model=model,
            constant=True,
            is_log=True,
            default_value=math.log(2.5),
            lower_bound=1e-6,
            unit=litres_per_hour,
        )

        context = build_chat_context(self.project)

        (variable,) = [
            v for v in context["variables"] if v["name"] == "CL"
        ]
        self.assertAlmostEqual(variable["value"], 2.5)
        self.assertTrue(variable["is_log"])
        self.assertEqual(variable["unit"], "L/h")

    def test_omits_covariate_machinery_from_the_parameter_list(self):
        # Mirrors getConstVariables: the sampled inputs and their medians are
        # set at simulate time, only the coefficients are user-editable.
        model = CombinedModel.objects.create(
            name="combined", project=self.project
        )
        # update() rather than save(): CombinedModel.save() needs a pk_model.
        CombinedModel.objects.filter(pk=model.pk).update(
            number_of_effect_compartments=2
        )
        for name, qname in [
            ("AGE", "Covariates.AGE"),
            ("mu_AGE", "Covariates.mu_AGE"),
            ("V3_a_AGE", "Covariates.V3_a_AGE"),
            ("CL", "PKCompartment.CL"),
            ("Kp", "EffectCompartment1.Kp"),
            ("Kp", "EffectCompartment2.Kp"),
        ]:
            Variable.objects.create(
                name=name,
                qname=qname,
                dosed_pk_model=model,
                constant=True,
            )

        context = build_chat_context(self.project)

        # Repeated effect compartments are numbered as the UI numbers them.
        self.assertEqual(
            [v["name"] for v in context["variables"]],
            ["V3_a_AGE", "CL", "Kp_Ce1", "Kp_Ce2"],
        )

    def test_context_omits_the_assembled_model_definition(self):
        # Fetched via get_current_model_definition instead, which also keeps
        # the myokit build off the chat request path.
        CombinedModel.objects.create(name="combined", project=self.project)

        with mock.patch.object(
            CombinedModel,
            "get_mmt",
            side_effect=AssertionError("myokit model built on the chat path"),
        ):
            context = build_chat_context(self.project)

        self.assertEqual(context["model"]["name"], "combined")
        self.assertNotIn("mmt", context["model"])

    def test_omits_trial_design_when_there_are_no_groups_or_protocols(self):
        context = build_chat_context(self.project)

        self.assertNotIn("trial_design", context)
        # No model has been configured for the project either.
        self.assertNotIn("model", context)
        self.assertNotIn("variables", context)

    def test_describes_a_group_with_its_covariates_and_doses(self):
        group = SubjectGroup.objects.create(
            name="Cohort A",
            project=self.project,
            study_size=12,
            age_min=18,
            age_max=65,
            m2f_ratio=0.4,
            population_region=SubjectGroup.Region.EU,
        )
        covariate = Covariate.objects.create(
            project=self.project,
            name="albumin",
            type=Covariate.Type.CONTINUOUS,
        )
        CovariatePopulation.objects.create(
            subject_group=group,
            covariate=covariate,
            median=42.0,
            variance=0.09,
        )
        protocol = self.add_protocol(
            "IV bolus arm",
            group=group,
            dose_type=Protocol.DoseType.DIRECT,
            amount_per_body_weight=True,
        )
        Dose.objects.create(
            protocol=protocol,
            start_time=0.0,
            amount=10.0,
            repeats=3,
            repeat_interval=24.0,
        )

        context = build_chat_context(self.project)

        self.assertEqual(
            context["trial_design"],
            {
                "groups": [
                    {
                        "name": "Cohort A",
                        # A project-owned group, so the population settings
                        # the user chose are reported. Contrast a
                        # dataset-derived group, which reports a real
                        # subject count instead — see the test below.
                        "subjects": 12,
                        "age_range": [18, 65],
                        "region": "Europe",
                        "male_fraction": 0.4,
                        # Stored as a log-normal median; the UI shows mean/SD.
                        "covariates": [
                            {
                                "name": "albumin",
                                "mean": 43.9332,
                                "std": 13.4821,
                            }
                        ],
                        "protocols": [
                            {
                                "name": "IV bolus arm",
                                # get_dose_type_display(), so "IV" not "D".
                                "route": "IV",
                                "per_body_weight": True,
                                "doses": [
                                    {
                                        "amount": 10.0,
                                        "unit": "mg",
                                        "start_time": 0.0,
                                        "time_unit": "h",
                                        # Separates a bolus from an infusion.
                                        "duration": 1.0,
                                        "repeats": 3,
                                        "repeat_interval": 24.0,
                                    }
                                ],
                            }
                        ],
                    }
                ],
                "ungrouped_protocols": [],
            },
        )

    def test_categorical_covariate_reports_categories_not_median(self):
        # median/variance have defaults, so a categorical covariate carries a
        # meaningless median.
        group = SubjectGroup.objects.create(
            name="Cohort A", project=self.project
        )
        covariate = Covariate.objects.create(
            project=self.project,
            name="sex",
            type=Covariate.Type.CATEGORICAL,
            n_categories=2,
            category_names=["female", "male"],
        )
        CovariatePopulation.objects.create(
            subject_group=group,
            covariate=covariate,
            category_probabilities=[0.4, 0.6],
        )

        (described,) = build_chat_context(self.project)["trial_design"][
            "groups"
        ][0]["covariates"]

        self.assertEqual(
            described,
            {
                "name": "sex",
                "categories": [
                    {"name": "female", "probability": 0.4},
                    {"name": "male", "probability": 0.6},
                ],
            },
        )
        self.assertNotIn("median", described)

    def test_dataset_group_reports_real_count_not_default_demographics(self):
        # Dataset imports never set study_size/age/region, so those hold
        # model defaults (200/20/60/EU) rather than user choices.
        dataset = Dataset.objects.create(name="observed", project=self.project)
        group = SubjectGroup.objects.create(
            name="Data-Group 1", dataset=dataset, project=self.project
        )
        for id_in_dataset in range(3):
            Subject.objects.create(
                id_in_dataset=id_in_dataset, dataset=dataset, group=group
            )
        protocol = self.add_protocol(
            "observed-Data-Group 1", group=group, dataset=dataset
        )
        Dose.objects.create(protocol=protocol, start_time=0.0, amount=10.0)

        (described,) = build_chat_context(self.project)["trial_design"][
            "groups"
        ]

        self.assertEqual(described["subjects"], 3)
        self.assertTrue(described["from_dataset"])
        self.assertNotIn("age_range", described)
        self.assertNotIn("region", described)
        # One dose row per subject per visit, so the list is unbounded.
        (described_protocol,) = described["protocols"]
        self.assertTrue(described_protocol["from_dataset"])
        self.assertNotIn("doses", described_protocol)

    def test_separates_protocols_that_belong_to_no_group(self):
        group = SubjectGroup.objects.create(name="Cohort A", project=self.project)
        self.add_protocol("Grouped arm", group=group)
        self.add_protocol(
            "Screening dose", dose_type=Protocol.DoseType.INDIRECT
        )

        trial_design = build_chat_context(self.project)["trial_design"]

        self.assertEqual(
            [p["name"] for p in trial_design["groups"][0]["protocols"]],
            ["Grouped arm"],
        )
        self.assertEqual(
            [p["name"] for p in trial_design["ungrouped_protocols"]],
            ["Screening dose"],
        )
        # An extravascular protocol reports the other route label, and a
        # protocol with no doses yields an empty list rather than being
        # dropped.
        ungrouped = trial_design["ungrouped_protocols"][0]
        self.assertEqual(ungrouped["route"], "Extravascular")
        self.assertEqual(ungrouped["doses"], [])

    def test_orders_groups_doses_and_covariates_deterministically(self):
        # Prompt text must be stable between turns, so ordering is pinned.
        second = SubjectGroup.objects.create(name="Cohort B", project=self.project)
        first = SubjectGroup.objects.create(name="Cohort A", project=self.project)
        protocol = self.add_protocol("Arm", group=first)
        Dose.objects.create(protocol=protocol, start_time=48.0, amount=5.0)
        Dose.objects.create(protocol=protocol, start_time=0.0, amount=10.0)

        trial_design = build_chat_context(self.project)["trial_design"]

        # Groups come back in primary-key order, not name order.
        self.assertEqual(
            [g["name"] for g in trial_design["groups"]],
            [second.name, first.name],
        )
        doses = trial_design["groups"][1]["protocols"][0]["doses"]
        self.assertEqual([d["amount"] for d in doses], [5.0, 10.0])
