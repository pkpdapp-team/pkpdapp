#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import pkpdapp.tests  # noqa: F401
from django.test import TestCase

from pkpdapp.models import (
    Compound,
    Dataset,
    Dose,
    EfficacyExperiment,
    Project,
    Protocol,
    SubjectGroup,
    Unit,
)
from pkpdapp.utils.chat_context_models import (
    CompoundContext,
    DrugTargetContext,
    ProtocolContext,
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

        experiment = EfficacyExperiment.objects.create(
            name="in vitro",
            c50=2.0,
            c50_unit=Unit.objects.get(symbol="nmol/L"),
            hill_coefficient=1.5,
            compound=self.compound,
        )
        self.compound.use_efficacy = experiment
        self.compound.save()

        group = SubjectGroup.objects.create(name="Sim-Group 1", project=self.project)
        protocol = Protocol.objects.create(name="IV", project=self.project, group=group)
        Dose.objects.create(protocol=protocol, start_time=0.0, amount=10.0)
        Dose.objects.create(protocol=protocol, start_time=24.0, amount=5.0, repeats=3)

    def load_project(self):
        return load_project_for_chat(self.project.pk)

    def load_protocol(self, name):
        for group in self.load_project().chat_groups:
            for protocol in group.chat_protocols:
                if protocol.name == name:
                    return protocol
        self.fail(f"no protocol named {name!r}")

    def test_describes_the_compound(self):
        project = self.load_project()

        compound = CompoundContext.from_compound(project.compound).model_dump()

        self.assertEqual(compound, {"name": "demo", "modality": "Small Molecule"})

    def test_describes_drug_and_target(self):
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

    def test_describes_protocols_and_doses(self):
        described = ProtocolContext.from_protocol(
            self.load_protocol("IV"), can_edit=True
        )

        self.assertEqual(
            described.model_dump(),
            {
                "name": "IV",
                "variable_qname": None,
                "amount_unit_symbol": "mg",
                "time_unit_symbol": "h",
                "per_body_weight": {"selected": False, "enabled": True},
                "from_dataset": False,
                "doses": [
                    {
                        "amount": 10.0,
                        "number_of_doses": 1,
                        "start_time": 0.0,
                        "duration": 1.0,
                        "repeat_interval": 1.0,
                    },
                    {
                        "amount": 5.0,
                        "number_of_doses": 3,
                        "start_time": 24.0,
                        "duration": 1.0,
                        "repeat_interval": 1.0,
                    },
                ],
            },
        )

    def test_dataset_protocols_have_no_doses(self):
        dataset = Dataset.objects.create(name="observed", project=self.project)
        group = SubjectGroup.objects.create(
            name="Data-Group 1", dataset=dataset, project=self.project
        )
        protocol = Protocol.objects.create(
            name="observed", project=self.project, group=group, dataset=dataset
        )
        Dose.objects.create(protocol=protocol, start_time=0.0, amount=10.0)

        described = ProtocolContext.from_protocol(
            self.load_protocol("observed"), can_edit=True
        )

        self.assertTrue(described.from_dataset)
        self.assertIsNone(described.doses)
        self.assertFalse(described.per_body_weight.enabled)
