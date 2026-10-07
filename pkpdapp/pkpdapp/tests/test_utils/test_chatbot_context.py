#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import pkpdapp.tests  # noqa: F401
from django.test import TestCase

from pkpdapp.models import (
    CombinedModel,
    Compound,
    Covariate,
    CovariatePopulation,
    Dataset,
    Dose,
    EfficacyExperiment,
    PharmacodynamicModel,
    PharmacokineticModel,
    Project,
    Protocol,
    Subject,
    SubjectGroup,
    Tag,
    Unit,
)
from pkpdapp.utils.chatbot_context import (
    CategoricalCovariateContext,
    ChatContext,
    CompoundContext,
    ContinuousCovariateContext,
    DrugTargetContext,
    GroupPopulationContext,
    ProtocolContext,
    SubjectGroupContext,
    TrialDesignContext,
    load_project_for_chat,
)
from pkpdapp.utils.lognormal import mean_std_to_median_logvar


class ChatContextTestCase(TestCase):
    def setUp(self):
        self.compound = Compound.objects.create(
            name="demo",
            compound_type=Compound.CompoundType.SMALL_MOLECULE,
            dissociation_constant=500,
        )
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

        self.project.pk_tags.add(Tag.objects.get(name="1-compartment"))
        self.model = CombinedModel.objects.create(
            name="demo model",
            project=self.project,
            pk_model=PharmacokineticModel.objects.get(name="1-compartmental model"),
            pd_model=PharmacodynamicModel.objects.get(
                name="Indirect effect model (stimulation of production)"
            ),
        )

        group = SubjectGroup.objects.create(
            name="Sim-Group 1",
            project=self.project,
            study_size=50,
            age_min=18,
            age_max=65,
            m2f_ratio=0.4,
            population_region=SubjectGroup.Region.US,
        )
        protocol = Protocol.objects.create(
            name="IV",
            project=self.project,
            group=group,
            variable=self.model.variables.get(qname="PKCompartment.A1"),
        )
        Dose.objects.create(protocol=protocol, start_time=0.0, amount=10.0)
        Dose.objects.create(protocol=protocol, start_time=24.0, amount=5.0, repeats=3)

        median, variance = mean_std_to_median_logvar(70.0, 14.0)
        CovariatePopulation.objects.create(
            subject_group=group,
            covariate=Covariate.objects.create(
                project=self.project, name="albumin", reference_value=40.0
            ),
            median=median,
            variance=variance,
        )
        CovariatePopulation.objects.create(
            subject_group=group,
            covariate=Covariate.objects.create(
                project=self.project,
                name="smoker",
                type=Covariate.Type.CATEGORICAL,
                n_categories=2,
            ),
            category_probabilities=[0.3, 0.7],
        )

    def load_project(self):
        return load_project_for_chat(self.project)

    def load_protocol(self, name):
        for group in self.load_project().groups.all():
            for protocol in group.protocols.all():
                if protocol.name == name:
                    return protocol
        self.fail(f"no protocol named {name!r}")

    def load_group(self, name):
        for group in self.load_project().groups.all():
            if group.name == name:
                return group
        self.fail(f"no group named {name!r}")

    def test_describes_the_compound(self):
        compound = CompoundContext.from_compound(self.load_project().compound)

        self.assertEqual(compound.name, "demo")
        self.assertEqual(compound.modality, "Small Molecule")

    def test_describes_drug_and_target(self):
        drug_target = DrugTargetContext.from_compound(
            self.load_project().compound, can_edit=True
        )

        # the ui shows "g/mol (Da)" instead of the plain unit symbol
        self.assertEqual(drug_target.molecular_mass_unit, "g/mol (Da)")
        experiment = drug_target.efficacy_safety_data[0]
        self.assertEqual(experiment.name, "in vitro")
        self.assertEqual(experiment.c50_unit_symbol, "nmol/L")
        # setUp picks this experiment for the compound
        self.assertTrue(experiment.selection.selected)

    def test_describes_protocols_and_doses(self):
        protocol = ProtocolContext.from_protocol(
            self.load_protocol("IV"), can_edit=True
        )

        # setUp doses A1, the ui names the protocol after its variable
        self.assertEqual(protocol.heading, "A1 Administration")
        self.assertFalse(protocol.from_dataset)
        self.assertEqual([dose.amount for dose in protocol.doses], [10.0, 5.0])
        self.assertEqual([dose.number_of_doses for dose in protocol.doses], [1, 3])

    def test_describes_dataset_protocols(self):
        dataset = Dataset.objects.create(name="observed", project=self.project)
        group = SubjectGroup.objects.create(
            name="Data-Group 1", dataset=dataset, project=self.project
        )
        protocol = Protocol.objects.create(
            name="observed", project=self.project, group=group, dataset=dataset
        )
        Dose.objects.create(protocol=protocol, start_time=0.0, amount=10.0)

        protocol = ProtocolContext.from_protocol(
            self.load_protocol("observed"), can_edit=True
        )

        self.assertTrue(protocol.from_dataset)
        self.assertEqual(len(protocol.doses), 1)
        # the api rejects edits to dataset protocols
        self.assertFalse(protocol.per_body_weight.enabled)

    def test_describes_the_group_population(self):
        population = GroupPopulationContext.from_group(
            self.load_group("Sim-Group 1")
        )

        self.assertEqual(population.study_size, 50)
        self.assertEqual(population.male_fraction, 0.4)
        self.assertEqual(population.region, "United States")

    def test_describes_custom_covariates(self):
        albumin, smoker = self.load_group("Sim-Group 1").covariate_populations.all()

        albumin = ContinuousCovariateContext.from_population(albumin)
        smoker = CategoricalCovariateContext.from_population(smoker)

        # setUp stores albumin as median / log variance, the ui shows mean / std
        self.assertEqual(albumin.mean, 70.0)
        self.assertEqual(albumin.standard_deviation, 14.0)
        self.assertEqual(smoker.category_probabilities, [0.3, 0.7])

    def test_orders_groups_and_protocols_like_the_ui(self):
        SubjectGroup.objects.create(name="Extra group", project=self.project)
        SubjectGroup.objects.create(name="Another group", project=self.project)
        Protocol.objects.create(
            name="Bolus", project=self.project, group=self.load_group("Sim-Group 1")
        )

        groups = TrialDesignContext.from_project(
            self.load_project(), can_edit=True
        ).groups

        # "Sim" groups first, then by name
        self.assertEqual(
            [group.name for group in groups],
            ["Sim-Group 1", "Another group", "Extra group"],
        )
        # protocols by name: "Bolus" (no doses, created above)
        #                    before "IV" (2 doses, created in setUp)
        self.assertEqual([len(p.doses) for p in groups[0].protocols], [0, 2])

    def test_describes_dataset_groups(self):
        dataset = Dataset.objects.create(name="observed", project=self.project)
        group = SubjectGroup.objects.create(
            name="Data-Group 1", dataset=dataset, project=self.project
        )
        for id_in_dataset in range(3):
            Subject.objects.create(
                id_in_dataset=id_in_dataset, dataset=dataset, group=group
            )

        data_group = SubjectGroupContext.from_group(
            self.load_group("Data-Group 1"), can_edit=True
        )

        self.assertTrue(data_group.from_dataset)
        self.assertEqual(data_group.subject_count, 3)
        # dataset imports leave the population fields at their defaults
        self.assertIsNone(data_group.population)

    def test_builds_the_whole_chat_context(self):
        context = ChatContext.from_project(
            self.project,
            can_edit=True,
            current_page="Model",
            current_sub_page="Parameters",
        )

        self.assertEqual(context.current_page, "Model")
        self.assertEqual(context.current_sub_page, "Parameters")
        self.assertEqual(context.project.name, "demo project")
        self.assertEqual(context.project.compound.name, "demo")
        self.assertEqual(
            context.project.trial_design_page.groups[0].name, "Sim-Group 1"
        )
