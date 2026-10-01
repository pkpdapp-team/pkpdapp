#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import pkpdapp.tests  # noqa: F401
from django.test import TestCase

from pkpdapp.models import Compound, EfficacyExperiment, Project, Unit
from pkpdapp.utils.chat_context_models import (
    CompoundContext,
    DrugTargetContext,
    load_project_for_chat,
)


class ChatContextTestCase(TestCase):
    def setUp(self):
        self.compound = Compound.objects.create(name="demo")
        self.project = Project.objects.create(
            name="demo project",
            compound=self.compound,
            description="A demo study",
            species=Project.Species.HUMAN,
        )

    def load_project(self):
        return load_project_for_chat(self.project.pk)

    def test_describes_the_compound(self):
        project = self.load_project()

        compound = CompoundContext.from_compound(project.compound).model_dump()

        self.assertEqual(compound, {"name": "demo", "modality": "Small Molecule"})

    def test_describes_drug_and_target(self):
        experiment = EfficacyExperiment.objects.create(
            name="in vitro",
            c50=2.0,
            c50_unit=Unit.objects.get(symbol="nmol/L"),
            hill_coefficient=1.5,
            compound=self.compound,
        )
        self.compound.use_efficacy = experiment
        self.compound.save()

        drug_target = DrugTargetContext.from_compound(
            self.load_project().compound, can_edit=True
        ).model_dump()

        self.assertEqual(drug_target["molecular_mass_unit_symbol"], "g/mol")
        self.assertEqual(
            drug_target["efficacy_safety_data"],
            [
                {
                    "selection": {"selected": True, "enabled": True},
                    "name": "in vitro",
                    "c50": 2.0,
                    "c50_unit_symbol": "nmol/L",
                    "hill_coefficient": 1.5,
                }
            ],
        )
