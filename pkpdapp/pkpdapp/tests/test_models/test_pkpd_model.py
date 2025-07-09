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
    PharmacodynamicModel,
    PharmacokineticModel,
    PkpdMapping,
    Project,
    DerivedVariable,
    Compound,
    TimeInterval,
    Unit,
)


class TestPkpdModel(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="12345")
        compound = Compound.objects.create(name="demo")
        self.project = Project.objects.create(name="demo", compound=compound)
        self.project.users.add(self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_copy(self):
        pk_model = PharmacokineticModel.objects.get(name="one_compartment_clinical")
        pd_model = PharmacodynamicModel.objects.get(
            name="indirect_effects_stimulation_production"
        )  # noqa E501
        pkpd_model = CombinedModel.objects.create(
            name="my wonderful model",
            pk_model=pk_model,
            pd_model=pd_model,
            project=self.project,
            has_saturation=True,

        )
        cl = pkpd_model.variables.get(qname="PKCompartment.CL")
        c1 = pkpd_model.variables.get(qname="PKCompartment.C1")
        a1 = pkpd_model.variables.get(qname="PKCompartment.A1")
        drug = pkpd_model.variables.get(qname="PDCompartment.C_Drug")
        mapping = PkpdMapping.objects.create(
            pkpd_model=pkpd_model,
            pk_variable=c1,
            pd_variable=drug,
        )
        derived = DerivedVariable.objects.create(
            pkpd_model=pkpd_model,
            pk_variable=a1,
            type=DerivedVariable.Type.TLAG,
        )
        hour_unit = Unit.objects.get(symbol="h")
        time_interval = TimeInterval.objects.create(
            pkpd_model=pkpd_model,
            start_time=0,
            end_time=168,
            unit=hour_unit
        )
        new_compound = Compound.objects.create(name="new compound")
        new_project = Project.objects.create(name="new project", compound=new_compound)
        cl.default_value = 1.123
        cl.lower_bound = 0.111
        cl.upper_bound = 3.331
        cl.save()
        pkpd_model_copy = pkpd_model.copy(new_project)
        # check its all the same
        self.assertEqual(pkpd_model_copy.name, pkpd_model.name)
        self.assertEqual(pkpd_model_copy.pk_model, pkpd_model.pk_model)
        self.assertEqual(pkpd_model_copy.pd_model, pkpd_model.pd_model)
        self.assertEqual(pkpd_model_copy.project, new_project)
        self.assertEqual(
            pkpd_model_copy.variables.count(), pkpd_model.variables.count()
        )
        self.assertEqual(pkpd_model_copy.mappings.count(), pkpd_model.mappings.count())
        self.assertEqual(
            pkpd_model_copy.derived_variables.count(),
            pkpd_model.derived_variables.count(),
        )  # noqa E501
        self.assertEqual(
            pkpd_model_copy.time_intervals.count(),
            pkpd_model.time_intervals.count(),
        )
        # check the variables are the same content but different objects
        for var in pkpd_model.variables.all():
            copy = pkpd_model_copy.variables.get(qname=var.qname)
            self.assertEqual(copy.default_value, var.default_value)
            self.assertEqual(copy.lower_bound, var.lower_bound)
            self.assertEqual(copy.upper_bound, var.upper_bound)
            self.assertNotEqual(copy.id, var.id)
        # check the mappings are the same content but different objects
        for mapping in pkpd_model.mappings.all():
            copy = pkpd_model_copy.mappings.get(
                pk_variable__qname=mapping.pk_variable.qname
            )
            self.assertEqual(
                copy.pd_variable.qname, mapping.pd_variable.qname
            )  # noqa E501
            self.assertNotEqual(copy.id, mapping.id)  # noqa E501
        # check the derived variables are the same content but different objects
        for derived in pkpd_model.derived_variables.all():
            copy = pkpd_model_copy.derived_variables.get(
                pk_variable__qname=derived.pk_variable.qname
            )  # noqa E501
            self.assertNotEqual(copy.id, derived.id)
        # check the time intervals are the same content but different objects
        for time_interval in pkpd_model.time_intervals.all():
            copy = pkpd_model_copy.time_intervals.get(
                start_time=time_interval.start_time
            )
            self.assertNotEqual(copy.id, time_interval.id)

    def test_combined_model_creation_all_models(self):
        pk_models = PharmacokineticModel.objects.all()
        pd_models = PharmacodynamicModel.objects.all()
        self.assertGreater(len(pk_models), 0)
        self.assertGreater(len(pd_models), 0)

        for pk_model in pk_models:
            for pd_model in pd_models:
                pkpd_model = CombinedModel.objects.create(
                    name=f"{pk_model.name} + {pd_model.name}",
                    pk_model=pk_model,
                    pd_model=pd_model,
                    project=self.project,
                )
                self.assertEqual(pkpd_model.pk_model, pk_model)
                self.assertEqual(pkpd_model.pd_model, pd_model)
                self.assertEqual(pkpd_model.project, self.project)

    def test_combined_model_creation_single_model(self):
        pk_model = PharmacokineticModel.objects.get(name="one_compartment_clinical")
        pd_model = PharmacodynamicModel.objects.get(
            name="indirect_effects_stimulation_production"
        )
        pkpd_model = CombinedModel.objects.create(
            name="my wonderful model",
            pk_model=pk_model,
            pd_model=pd_model,
            project=self.project,
        )
        PkpdMapping.objects.create(
            pkpd_model=pkpd_model,
            pk_variable=pkpd_model.variables.get(
                qname="PKCompartment.C1",
            ),
            pd_variable=pkpd_model.variables.get(
                qname="PDCompartment.C_Drug",
            ),
        )
        vars = pkpd_model.variables.values_list("qname", flat=True)
        for var in ["PKCompartment.C1", "PDCompartment.C_Drug", "PDCompartment.E"]:
            self.assertIn(var, vars)
        self.assertFalse(
            pkpd_model.get_myokit_model().get("PKCompartment.C1").is_state()
        )
        self.assertFalse(
            pkpd_model.get_myokit_model().get("PKCompartment.C1").is_constant()
        )
        self.assertTrue(pkpd_model.get_myokit_model().get("PDCompartment.E").is_state())
        self.assertFalse(pkpd_model.variables.get(qname="PKCompartment.C1").state)
        self.assertFalse(pkpd_model.variables.get(qname="PKCompartment.C1").constant)
        self.assertTrue(pkpd_model.variables.get(qname="PDCompartment.E").state)
        pkpd_model.get_myokit_model().validate()
        self.assertFalse(
            pkpd_model.variables.get(qname="PDCompartment.C_Drug").constant
        )

    def test_combined_model_with_derived_variable(self):
        pk_model = PharmacokineticModel.objects.get(name="one_compartment_clinical")
        pd_model = PharmacodynamicModel.objects.get(
            name="indirect_effects_stimulation_production"
        )
        pkpd_model = CombinedModel.objects.create(
            name="my wonderful model",
            pk_model=pk_model,
            pd_model=pd_model,
            project=self.project,
        )
        DerivedVariable.objects.create(
            pkpd_model=pkpd_model,
            pk_variable=pkpd_model.variables.get(
                qname="PKCompartment.C1",
            ),
            type=DerivedVariable.Type.FRACTION_UNBOUND_PLASMA,
        )
        derived_var_qname = "PKCompartment.calc_C1_f"
        PkpdMapping.objects.create(
            pkpd_model=pkpd_model,
            pk_variable=pkpd_model.variables.get(
                qname=derived_var_qname,
            ),
            pd_variable=pkpd_model.variables.get(
                qname="PDCompartment.C_Drug",
            ),
        )
        vars = pkpd_model.variables.values_list("qname", flat=True)
        for var in [derived_var_qname, "PDCompartment.C_Drug", "PDCompartment.E"]:
            self.assertIn(var, vars)
        self.assertFalse(
            pkpd_model.get_myokit_model().get(derived_var_qname).is_state()
        )
        self.assertFalse(
            pkpd_model.get_myokit_model().get(derived_var_qname).is_constant()
        )
        self.assertFalse(
            pkpd_model.get_myokit_model().get("PDCompartment.C_Drug").is_constant()
        )

    def test_combined_model_with_time_interval(self):
        pk_model = PharmacokineticModel.objects.get(name="one_compartment_clinical")
        pd_model = PharmacodynamicModel.objects.get(
            name="indirect_effects_stimulation_production"
        )
        pkpd_model = CombinedModel.objects.create(
            name="my wonderful model",
            pk_model=pk_model,
            pd_model=pd_model,
            project=self.project,
        )
        hour_unit = Unit.objects.get(symbol="h")
        TimeInterval.objects.create(
            pkpd_model=pkpd_model,
            start_time=0,
            end_time=168,
            unit=hour_unit,
        )
        self.assertEqual(pkpd_model.time_intervals.count(), 1)
        self.assertEqual(pkpd_model.time_intervals.first().unit, hour_unit)
        self.assertEqual(pkpd_model.time_intervals.first().start_time, 0)
        self.assertEqual(pkpd_model.time_intervals.first().end_time, 168)

    def test_combine_multiple_pd_models(self):
        pk = PharmacokineticModel.objects.get(
            name="one_compartment_preclinical",
        )
        pd = PharmacodynamicModel.objects.get(
            name="tumour_growth_gompertz",
        )
        pd2 = PharmacodynamicModel.objects.get(
            name="tumour_growth_inhibition_delay_cell_distribution_conc_prop_kill",  # noqa E501
        )
        combined = CombinedModel.objects.create(
            name="my_combined_model",
            pk_model=pk,
            pd_model=pd,
            pd_model2=pd2,
        )

        pk_vars = [v.qname() for v in pk.get_myokit_model().variables()]
        pd_vars = [
            v.qname()
            for v in pd.get_myokit_model().variables()
            if v.qname() != "environment.t"
        ]
        pd2_vars = [
            v.qname().replace("PDCompartment", "PDCompartment2")
            for v in pd2.get_myokit_model().variables()
            if v.qname() != "environment.t"
        ]
        expected_vars = [v for v in pk_vars + pd_vars + pd2_vars]
        removed_vars = ["PDCompartment2.TS", "PDCompartment2.TS0"]
        for var in removed_vars:
            expected_vars.remove(var)
        model = combined.get_myokit_model()
        model_vars = [v.qname() for v in model.variables()]
        self.assertCountEqual(model_vars, expected_vars)
        print("combined model validated", model.code())
