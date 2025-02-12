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
)


class TestDerivedVariables(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="12345")
        compound = Compound.objects.create(name="demo")
        self.project = Project.objects.create(name="demo", compound=compound)
        self.project.users.add(self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.pk_model = PharmacokineticModel.objects.get(name="1-compartmental model")
        self.pd_model = PharmacodynamicModel.objects.get(
            name="Indirect effect model (stimulation of production)"
        )
        self.pkpd_model = CombinedModel.objects.create(
            name="my wonderful model",
            pk_model=self.pk_model,
            pd_model=self.pd_model,
            project=self.project,
        )

    def test_michaelis_menten(self):
        DerivedVariable.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=self.pkpd_model.variables.get(
                qname="PDCompartment.C_Drug",
            ),
            secondary_variable=self.pkpd_model.variables.get(
                qname="PKCompartment.C1",
            ),
            type=DerivedVariable.Type.MICHAELIS_MENTEN,
        )
        self.pkpd_model = CombinedModel.objects.get(pk=self.pkpd_model.pk)
        myokit_model = self.pkpd_model.get_myokit_model()
        vars = [v.qname() for v in myokit_model.variables()]
        for var in [
            "PDCompartment.C_Drug",
            "PDCompartment.C_Drug_C1_MM",
            "PDCompartment.Km_C_Drug",
        ]:
            self.assertIn(var, vars)
        self.assertTrue(myokit_model.get("PDCompartment.C_Drug").is_constant())
        self.assertFalse(myokit_model.get("PDCompartment.C_Drug_C1_MM").is_constant())
        self.assertEqual(
            str(myokit_model.get("PDCompartment.C_Drug_C1_MM").rhs()),
            "PDCompartment.C_Drug * (1 / (1 + PKCompartment.C1 / PDCompartment.Km_C_Drug))",  # noqa E501
        )
        self.assertEqual(
            str(myokit_model.get("PDCompartment.STIM").rhs()),
            "PDCompartment.C_Drug_C1_MM^PDCompartment.HC / (PDCompartment.C_Drug_C1_MM^PDCompartment.HC + PDCompartment.C50^PDCompartment.HC)",  # noqa E501
        )

    def test_extended_michaelis_menten(self):
        DerivedVariable.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=self.pkpd_model.variables.get(
                qname="PDCompartment.C_Drug",
            ),
            secondary_variable=self.pkpd_model.variables.get(
                qname="PKCompartment.C1",
            ),
            type=DerivedVariable.Type.EXTENDED_MICHAELIS_MENTEN,
        )
        self.pkpd_model = CombinedModel.objects.get(pk=self.pkpd_model.pk)
        myokit_model = self.pkpd_model.get_myokit_model()
        vars = [v.qname() for v in myokit_model.variables()]
        for var in [
            "PDCompartment.C_Drug",
            "PDCompartment.C_Drug_C1_eMM",
            "PDCompartment.Km_C_Drug",
            "PDCompartment.h_C_Drug",
            "PDCompartment.C_Drug_lin",
        ]:
            self.assertIn(var, vars)
        self.assertTrue(myokit_model.get("PDCompartment.C_Drug").is_constant())
        self.assertFalse(myokit_model.get("PDCompartment.C_Drug_C1_eMM").is_constant())
        self.assertEqual(
            str(myokit_model.get("PDCompartment.C_Drug_C1_eMM").rhs()),
            "PDCompartment.C_Drug * (1 / (1 + (PKCompartment.C1 / PDCompartment.Km_C_Drug)^PDCompartment.h_C_Drug)) + PDCompartment.C_Drug_lin",  # noqa E501
        )
        self.assertEqual(
            str(myokit_model.get("PDCompartment.STIM").rhs()),
            "PDCompartment.C_Drug_C1_eMM^PDCompartment.HC / (PDCompartment.C_Drug_C1_eMM^PDCompartment.HC + PDCompartment.C50^PDCompartment.HC)",  # noqa E501
        )

    def test_emax(self):
        DerivedVariable.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=self.pkpd_model.variables.get(
                qname="PDCompartment.C_Drug",
            ),
            type=DerivedVariable.Type.EMAX,
        )
        self.pkpd_model = CombinedModel.objects.get(pk=self.pkpd_model.pk)
        myokit_model = self.pkpd_model.get_myokit_model()
        vars = [v.qname() for v in myokit_model.variables()]
        for var in [
            "PDCompartment.C_Drug",
            "PDCompartment.C_Drug_Emax",
            "PDCompartment.D50_C_Drug",
            "PDCompartment.h_C_Drug",
            "PDCompartment.C_Drug_min",
        ]:
            self.assertIn(var, vars)
        self.assertTrue(myokit_model.get("PDCompartment.C_Drug").is_constant())
        self.assertTrue(myokit_model.get("PDCompartment.C_Drug_Emax").is_constant())
        self.assertEqual(
            str(myokit_model.get("PDCompartment.C_Drug_Emax").rhs()),
            "PDCompartment.C_Drug * (PDCompartment.C_Drug^PDCompartment.h_C_Drug / (PDCompartment.C_Drug^PDCompartment.h_C_Drug + PDCompartment.D50_C_Drug^PDCompartment.h_C_Drug)) + PDCompartment.C_Drug_min",  # noqa E501
        )
        self.assertEqual(
            str(myokit_model.get("PDCompartment.STIM").rhs()),
            "PDCompartment.C_Drug_Emax^PDCompartment.HC / (PDCompartment.C_Drug_Emax^PDCompartment.HC + PDCompartment.C50^PDCompartment.HC)",  # noqa E501
        )

    def test_imax(self):
        DerivedVariable.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=self.pkpd_model.variables.get(
                qname="PDCompartment.C_Drug",
            ),
            type=DerivedVariable.Type.IMAX,
        )
        self.pkpd_model = CombinedModel.objects.get(pk=self.pkpd_model.pk)
        myokit_model = self.pkpd_model.get_myokit_model()
        vars = [v.qname() for v in myokit_model.variables()]
        for var in [
            "PDCompartment.C_Drug",
            "PDCompartment.C_Drug_Imax",
            "PDCompartment.D50_C_Drug",
            "PDCompartment.h_C_Drug",
            "PDCompartment.C_Drug_min",
        ]:
            self.assertIn(var, vars)
        self.assertTrue(myokit_model.get("PDCompartment.C_Drug").is_constant())
        self.assertTrue(myokit_model.get("PDCompartment.C_Drug_Imax").is_constant())
        self.assertEqual(
            str(myokit_model.get("PDCompartment.C_Drug_Imax").rhs()),
            "PDCompartment.C_Drug * (1 - PDCompartment.C_Drug^PDCompartment.h_C_Drug / (PDCompartment.C_Drug^PDCompartment.h_C_Drug + PDCompartment.D50_C_Drug^PDCompartment.h_C_Drug)) + PDCompartment.C_Drug_min",  # noqa E501
        )
        self.assertEqual(
            str(myokit_model.get("PDCompartment.STIM").rhs()),
            "PDCompartment.C_Drug_Imax^PDCompartment.HC / (PDCompartment.C_Drug_Imax^PDCompartment.HC + PDCompartment.C50^PDCompartment.HC)",  # noqa E501
        )

    def test_power(self):
        # base_variable_Power = base_variable * (C_Drug/Ref_D)**a_D
        DerivedVariable.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=self.pkpd_model.variables.get(
                qname="PDCompartment.C_Drug",
            ),
            type=DerivedVariable.Type.POWER,
        )
        self.pkpd_model = CombinedModel.objects.get(pk=self.pkpd_model.pk)
        myokit_model = self.pkpd_model.get_myokit_model()
        vars = [v.qname() for v in myokit_model.variables()]
        for var in [
            "PDCompartment.C_Drug",
            "PDCompartment.C_Drug_Power",
            "PDCompartment.Ref_D_C_Drug",
            "PDCompartment.a_D_C_Drug",
        ]:
            self.assertIn(var, vars)
        self.assertTrue(myokit_model.get("PDCompartment.C_Drug").is_constant())
        self.assertTrue(myokit_model.get("PDCompartment.C_Drug_Power").is_constant())
        self.assertEqual(
            str(myokit_model.get("PDCompartment.C_Drug_Power").rhs()),
            "PDCompartment.C_Drug * (PDCompartment.C_Drug / PDCompartment.Ref_D_C_Drug)^PDCompartment.a_D_C_Drug",  # noqa E501
        )
        self.assertEqual(
            str(myokit_model.get("PDCompartment.STIM").rhs()),
            "PDCompartment.C_Drug_Power^PDCompartment.HC / (PDCompartment.C_Drug_Power^PDCompartment.HC + PDCompartment.C50^PDCompartment.HC)",  # noqa E501
        )

    def test_exp_decay(self):
        DerivedVariable.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=self.pkpd_model.variables.get(
                qname="PDCompartment.C_Drug",
            ),
            type=DerivedVariable.Type.EXP_DECAY,
        )
        self.pkpd_model = CombinedModel.objects.get(pk=self.pkpd_model.pk)
        myokit_model = self.pkpd_model.get_myokit_model()
        vars = [v.qname() for v in myokit_model.variables()]
        for var in [
            "PDCompartment.C_Drug",
            "PDCompartment.C_Drug_TDI",
            "PDCompartment.k_C_Drug",
            "PDCompartment.C_Drug_min",
        ]:
            self.assertIn(var, vars)
        self.assertTrue(myokit_model.get("PDCompartment.C_Drug").is_constant())
        self.assertFalse(myokit_model.get("PDCompartment.C_Drug_TDI").is_constant())
        self.assertEqual(
            str(myokit_model.get("PDCompartment.C_Drug_TDI").rhs()),
            "PDCompartment.C_Drug * exp(-(PDCompartment.k_C_Drug * environment.t)) + PDCompartment.C_Drug_min",  # noqa E501
        )
        self.assertEqual(
            str(myokit_model.get("PDCompartment.STIM").rhs()),
            "PDCompartment.C_Drug_TDI^PDCompartment.HC / (PDCompartment.C_Drug_TDI^PDCompartment.HC + PDCompartment.C50^PDCompartment.HC)",  # noqa E501
        )

    def test_exp_growth(self):
        # base_variable_IND = base_variable * [1-exp(-k_X*time)] +Xmin
        DerivedVariable.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=self.pkpd_model.variables.get(
                qname="PDCompartment.C_Drug",
            ),
            type=DerivedVariable.Type.EXP_INCREASE,
        )
        self.pkpd_model = CombinedModel.objects.get(pk=self.pkpd_model.pk)
        myokit_model = self.pkpd_model.get_myokit_model()
        vars = [v.qname() for v in myokit_model.variables()]
        for var in [
            "PDCompartment.C_Drug",
            "PDCompartment.C_Drug_IND",
            "PDCompartment.k_C_Drug",
            "PDCompartment.C_Drug_min",
        ]:
            self.assertIn(var, vars)
        self.assertTrue(myokit_model.get("PDCompartment.C_Drug").is_constant())
        self.assertFalse(myokit_model.get("PDCompartment.C_Drug_IND").is_constant())
        self.assertEqual(
            str(myokit_model.get("PDCompartment.C_Drug_IND").rhs()),
            "PDCompartment.C_Drug * (1 - exp(-(PDCompartment.k_C_Drug * environment.t))) + PDCompartment.C_Drug_min",  # noqa E501
        )
        self.assertEqual(
            str(myokit_model.get("PDCompartment.STIM").rhs()),
            "PDCompartment.C_Drug_IND^PDCompartment.HC / (PDCompartment.C_Drug_IND^PDCompartment.HC + PDCompartment.C50^PDCompartment.HC)",  # noqa E501
        )

    def test_fraction_unbound_plasma(self):
        DerivedVariable.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=self.pkpd_model.variables.get(
                qname="PKCompartment.C1",
            ),
            type=DerivedVariable.Type.FRACTION_UNBOUND_PLASMA,
        )
        derived_var_qname = "PKCompartment.calc_C1_f"
        PkpdMapping.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=self.pkpd_model.variables.get(
                qname=derived_var_qname,
            ),
            pd_variable=self.pkpd_model.variables.get(
                qname="PDCompartment.C_Drug",
            ),
        )
        vars = self.pkpd_model.variables.values_list("qname", flat=True)
        for var in [derived_var_qname, "PDCompartment.C_Drug", "PDCompartment.E"]:
            self.assertIn(var, vars)
        self.assertFalse(
            self.pkpd_model.get_myokit_model().get(derived_var_qname).is_state()
        )
        self.assertFalse(
            self.pkpd_model.get_myokit_model().get(derived_var_qname).is_constant()
        )
        self.assertFalse(
            self.pkpd_model.get_myokit_model().get("PDCompartment.C_Drug").is_constant()
        )
