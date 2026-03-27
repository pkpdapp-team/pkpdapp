#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from pkpdapp.models import (
    CombinedModel,
    PharmacokineticModel,
    PharmacodynamicModel,
    PkpdMapping,
    Project,
    Compound,
    Dataset,
    Subject,
    SubjectGroup,
    Biomarker,
    BiomarkerType,
    Protocol,
    Simulation,
    SimulationPlot,
    SimulationSlider,
    SimulationYAxis,
    Unit,
    EfficacyExperiment,
    DerivedVariable,
)


class TestProject(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="12345")
        compound = Compound.objects.create(name="demo", compound_type="LM")
        self.project = Project.objects.create(name="demo", compound=compound)
        self.project.users.add(self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_project_weight_unit_default(self):
        # weight unit should be set to default (g)
        self.assertEqual(self.project.species_weight_unit.symbol, "kg")

    def test_copy(self):
        pk_model = PharmacokineticModel.objects.get(name="1-compartmental model")
        pk_model2 = PharmacokineticModel.objects.get(
            name="First order absorption model"
        )
        pd_model = PharmacodynamicModel.objects.get(
            name="indirect_effects_stimulation_production"
        )
        pkpd_model = CombinedModel.objects.create(
            name="my wonderful model",
            pk_model=pk_model,
            pk_model2=pk_model2,
            pd_model=pd_model,
            project=self.project,
            number_of_effect_compartments=1,
        )
        c_drug_pd = pkpd_model.variables.get(qname="PDCompartment.C_Drug")
        dataset = Dataset.objects.create(name="my dataset", project=self.project)
        group = SubjectGroup.objects.create(
            name="Group 1",
            id_in_dataset="1",
            dataset=dataset,
            project=self.project,
        )
        subject = Subject.objects.create(
            id_in_dataset=1,
            dataset=dataset,
            group=group,
        )

        protocol = Protocol.objects.create(
            name="my protocol",
            variable=c_drug_pd,
            dataset=dataset,
            group=group,
            project=self.project,
        )
        dose = protocol.doses.create(
            amount=1.0, start_time=0.0, repeats=2, repeat_interval=1.1
        )
        protocol.doses.set([dose])
        c_drug_pd.save()

        a1 = pkpd_model.variables.get(qname="PKCompartment.A1")
        cl = pkpd_model.variables.get(qname="PKCompartment.CL")
        c1 = pkpd_model.variables.get(qname="PKCompartment.C1")
        h = Unit.objects.get(symbol="h")
        mg = Unit.objects.get(symbol="mg")

        biomarker_type = BiomarkerType.objects.create(
            name="my biomarker type",
            stored_unit=mg,
            display_unit=mg,
            stored_time_unit=h,
            display_time_unit=h,
            dataset=dataset,
            variable=c_drug_pd,
        )
        biomarker = Biomarker.objects.create(
            time=1.0,
            subject=subject,
            biomarker_type=biomarker_type,
            value=42.0,
        )

        mapping = PkpdMapping.objects.create(
            pkpd_model=pkpd_model,
            pk_variable=c1,
            pd_variable=c_drug_pd,
        )

        DerivedVariable.objects.create(
            pkpd_model=pkpd_model,
            pk_variable=cl,
            secondary_variable=c1,
            type=DerivedVariable.Type.EXTENDED_MICHAELIS_MENTEN,
        )

        sim = Simulation.objects.create(
            project=self.project,
            time_max=30,
            time_max_unit=h,
        )
        plot = SimulationPlot.objects.create(
            simulation=sim,
            index=0,
            x_unit=h,
        )
        yaxis = SimulationYAxis.objects.create(
            plot=plot,
            variable=a1,
        )
        slider = SimulationSlider.objects.create(
            simulation=sim,
            variable=cl,
        )

        effic = EfficacyExperiment.objects.create(
            name="my efficacy experiment",
            c50=2.0,
            c50_unit=h,
            compound=self.project.compound,
        )

        new_project = self.project.copy()

        # check that EffectCompartment1.Kp exists
        kp = new_project.pk_models.first().variables.filter(
            qname="EffectCompartment1.Kp"
        )
        self.assertEqual(kp.count(), 1)

        # check that the derived variable exists
        new_dv = new_project.pk_models.first().derived_variables.first()
        self.assertEqual(new_dv.pk_variable.qname, "PKCompartment.CL")
        self.assertEqual(new_dv.secondary_variable.qname, "PKCompartment.C1")
        self.assertEqual(new_dv.type, DerivedVariable.Type.EXTENDED_MICHAELIS_MENTEN)

        # check that the new project has the right name
        self.assertEqual(new_project.name, "Copy of demo")

        # check that dataset entities are copied
        self.assertEqual(new_project.datasets.count(), 1)
        new_dataset = new_project.datasets.first()
        self.assertEqual(new_dataset.name, "my dataset")
        self.assertNotEqual(new_dataset.pk, dataset.pk)

        self.assertEqual(new_dataset.groups.count(), 1)
        new_group = new_dataset.groups.first()
        self.assertEqual(new_group.name, "Group 1")
        self.assertEqual(new_group.id_in_dataset, "1")

        self.assertEqual(new_dataset.subjects.count(), 1)
        new_subject = new_dataset.subjects.first()
        self.assertEqual(new_subject.id_in_dataset, 1)
        self.assertEqual(new_subject.group, new_group)

        self.assertEqual(new_dataset.biomarker_types.count(), 1)
        new_biomarker_type = new_dataset.biomarker_types.first()
        self.assertEqual(new_biomarker_type.name, "my biomarker type")
        self.assertEqual(new_biomarker_type.variable.qname, "PDCompartment.C_Drug")

        self.assertEqual(new_dataset.biomarker_types.first().biomarkers.count(), 1)
        new_biomarker = new_dataset.biomarker_types.first().biomarkers.first()
        self.assertNotEqual(new_biomarker.pk, biomarker.pk)
        self.assertEqual(new_biomarker.subject, new_subject)
        self.assertEqual(new_biomarker.value, 42.0)

        # check that the compound is there and has the right name
        new_compound = new_project.compound
        self.assertEqual(new_compound.name, "demo")
        self.assertNotEqual(new_compound.pk, self.project.compound.pk)
        self.assertEqual(new_compound.compound_type, "LM")

        # check that the model is there and has the right name
        self.assertEqual(new_project.pk_models.count(), 1)
        new_model = new_project.pk_models.first()
        self.assertEqual(new_model.name, "my wonderful model")
        self.assertEqual(new_model.pk_model2, pkpd_model.pk_model2)
        self.assertEqual(new_model.pd_model, pkpd_model.pd_model)
        self.assertNotEqual(new_model.pk, pkpd_model.pk)

        # check that PK/PD mapping is copied
        self.assertEqual(new_model.mappings.count(), 1)
        new_mapping = new_model.mappings.first()
        self.assertNotEqual(new_mapping.pk, mapping.pk)
        self.assertEqual(new_mapping.pk_variable.qname, "PKCompartment.C1")
        self.assertEqual(new_mapping.pd_variable.qname, "PDCompartment.C_Drug")

        # check that the protocol is there and has the right name
        new_c_drug_pd = new_model.variables.get(qname="PDCompartment.C_Drug")
        new_a1 = new_model.variables.get(qname="PKCompartment.A1")
        self.assertNotEqual(new_c_drug_pd.pk, c_drug_pd.pk)
        self.assertEqual(new_c_drug_pd.protocols.count(), 1)
        new_protocol = new_c_drug_pd.protocols.first()
        self.assertEqual(new_protocol.name, "my protocol")
        self.assertNotEqual(new_protocol.pk, protocol.pk)
        self.assertEqual(new_protocol.dataset, new_dataset)
        self.assertEqual(new_protocol.group, new_group)
        self.assertEqual(new_protocol.variable.qname, "PDCompartment.C_Drug")
        # check that this is the only protocol for this project
        self.assertEqual(new_project.protocols.count(), 1)
        self.assertEqual(new_protocol.doses.count(), 1)
        new_dose = new_protocol.doses.first()
        self.assertNotEqual(new_dose.pk, dose.pk)
        self.assertEqual(new_dose.amount, 1.0)
        self.assertEqual(new_dose.start_time, 0.0)
        self.assertEqual(new_dose.repeats, 2)
        self.assertEqual(new_dose.repeat_interval, 1.1)

        # check that the simulation is there and has the right name
        self.assertEqual(new_project.simulations.count(), 1)
        new_sim = new_project.simulations.first()
        self.assertEqual(new_sim.time_max, 30)
        self.assertEqual(new_sim.time_max_unit, h)
        self.assertNotEqual(new_sim.pk, sim.pk)
        self.assertEqual(new_sim.plots.count(), 1)
        new_plot = new_sim.plots.first()
        self.assertNotEqual(new_plot.pk, plot.pk)
        self.assertEqual(new_plot.y_axes.count(), 1)
        new_yaxis = new_plot.y_axes.first()
        self.assertNotEqual(new_yaxis.pk, yaxis.pk)
        self.assertEqual(new_yaxis.variable, new_a1)

        # check that the slider is there and has the right name
        self.assertEqual(new_sim.sliders.count(), 1)
        new_slider = new_sim.sliders.first()
        self.assertNotEqual(new_slider.pk, slider.pk)
        self.assertEqual(
            new_slider.variable, new_model.variables.get(qname="PKCompartment.CL")
        )  # noqa E501

        # check that the efficacy experiment is there and has the right name
        self.assertEqual(new_project.compound.efficacy_experiments.count(), 1)
        new_effic = new_project.compound.efficacy_experiments.first()
        self.assertNotEqual(new_effic.pk, effic.pk)
        self.assertEqual(new_effic.name, "my efficacy experiment")
        self.assertEqual(new_effic.c50, 2.0)
        self.assertEqual(new_effic.c50_unit, h)
