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
    Protocol,
    Dose,
    Unit,
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
        protocol = Protocol.objects.create(
            name="test protocol",
            project=self.project,
        )
        Dose.objects.create(
            protocol=protocol,
            start_time=0,
            amount=100,
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
            "PKNonlinearities.C_Drug_C1_MM",
            "PKNonlinearities.Km_C_Drug",
        ]:
            self.assertIn(var, vars)
        self.assertTrue(myokit_model.get("PDCompartment.C_Drug").is_constant())
        self.assertFalse(
            myokit_model.get("PKNonlinearities.C_Drug_C1_MM").is_constant()
        )
        self.assertEqual(
            str(myokit_model.get("PKNonlinearities.C_Drug_C1_MM").rhs()),
            "PDCompartment.C_Drug * (1 / (1 + PKCompartment.C1 / PKNonlinearities.Km_C_Drug))",  # noqa E501
        )
        self.assertEqual(
            str(myokit_model.get("PDCompartment.PDO").rhs()),
            "PKNonlinearities.C_Drug_C1_MM^PDCompartment.HC / (PKNonlinearities.C_Drug_C1_MM^PDCompartment.HC + PDCompartment.C50^PDCompartment.HC)",  # noqa E501
        )

    def test_extended_michaelis_menten(self):
        parent_var = self.pkpd_model.variables.get(qname="PDCompartment.C_Drug")
        # Set unit_per_body_weight to True to test if Pmin inherits it
        parent_var.unit_per_body_weight = True
        parent_var.save()
        parent_unit = parent_var.unit
        parent_per_kg = parent_var.unit_per_body_weight

        DerivedVariable.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=parent_var,
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
            "PKNonlinearities.C_Drug_C1_eMM",
            "PKNonlinearities.Km_C_Drug",
            "PKNonlinearities.hll_C_Drug",
            "PKNonlinearities.C_Drug_min",
        ]:
            self.assertIn(var, vars)
        self.assertTrue(myokit_model.get("PDCompartment.C_Drug").is_constant())
        self.assertFalse(
            myokit_model.get("PKNonlinearities.C_Drug_C1_eMM").is_constant()
        )
        self.assertEqual(
            str(myokit_model.get("PKNonlinearities.C_Drug_C1_eMM").rhs()),
            "(PDCompartment.C_Drug - PKNonlinearities.C_Drug_min) * (1 / (1 + (if(PKCompartment.C1 >= 0, PKCompartment.C1, 0) / PKNonlinearities.Km_C_Drug)^PKNonlinearities.hll_C_Drug)) + PKNonlinearities.C_Drug_min",  # noqa E501
        )
        self.assertEqual(
            str(myokit_model.get("PDCompartment.PDO").rhs()),
            "PKNonlinearities.C_Drug_C1_eMM^PDCompartment.HC / (PKNonlinearities.C_Drug_C1_eMM^PDCompartment.HC + PDCompartment.C50^PDCompartment.HC)",  # noqa E501
        )

        # Check that Pmin has the same unit as parent
        pmin_var = self.pkpd_model.variables.get(qname="PKNonlinearities.C_Drug_min")
        self.assertEqual(pmin_var.unit, parent_unit)
        self.assertEqual(pmin_var.unit_per_body_weight, parent_per_kg)

    def test_emax(self):
        parent_var = self.pkpd_model.variables.get(qname="PDCompartment.C_Drug")
        # Set unit_per_body_weight to True to test if Pmin inherits it
        parent_var.unit_per_body_weight = True
        parent_var.save()
        parent_unit = parent_var.unit
        parent_per_kg = parent_var.unit_per_body_weight

        # Set protocol with specific amount unit and per_kg
        protocol = self.project.protocols.first()
        dose_unit = Unit.objects.get(symbol="µg")
        protocol.amount_unit = dose_unit
        protocol.amount_per_body_weight = True
        protocol.save()

        DerivedVariable.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=parent_var,
            type=DerivedVariable.Type.EMAX,
        )
        self.pkpd_model = CombinedModel.objects.get(pk=self.pkpd_model.pk)
        myokit_model = self.pkpd_model.get_myokit_model()

        vars = [v.qname() for v in myokit_model.variables()]
        for var in [
            "PDCompartment.C_Drug",
            "PKNonlinearities.C_Drug",
            "PKNonlinearities.C_Drug_Emax",
            "PKNonlinearities.D50_C_Drug",
            "PKNonlinearities.hll_C_Drug",
            "PKNonlinearities.C_Drug_min",
        ]:
            self.assertIn(var, vars)
        self.assertTrue(myokit_model.get("PDCompartment.C_Drug").is_constant())
        self.assertTrue(myokit_model.get("PKNonlinearities.C_Drug_Emax").is_constant())
        print(myokit_model.get("PKNonlinearities.C_Drug_Emax").rhs().code())
        self.assertEqual(
            str(myokit_model.get("PKNonlinearities.C_Drug_Emax").rhs()),
            "(PDCompartment.C_Drug - PKNonlinearities.C_Drug_min) * (PKNonlinearities.C_Drug^PKNonlinearities.hll_C_Drug / (PKNonlinearities.C_Drug^PKNonlinearities.hll_C_Drug + PKNonlinearities.D50_C_Drug^PKNonlinearities.hll_C_Drug)) + PKNonlinearities.C_Drug_min",  # noqa E501
        )
        self.assertEqual(
            str(myokit_model.get("PDCompartment.PDO").rhs()),
            "PKNonlinearities.C_Drug_Emax^PDCompartment.HC / (PKNonlinearities.C_Drug_Emax^PDCompartment.HC + PDCompartment.C50^PDCompartment.HC)",  # noqa E501
        )

        # Check that Pmin has the same unit as parent
        pmin_var = self.pkpd_model.variables.get(qname="PKNonlinearities.C_Drug_min")
        self.assertEqual(pmin_var.unit, parent_unit)
        self.assertEqual(pmin_var.unit_per_body_weight, parent_per_kg)

        # Check that D50 has the same unit and unit_per_body_weight as the dose
        d50_var = self.pkpd_model.variables.get(qname="PKNonlinearities.D50_C_Drug")
        self.assertEqual(d50_var.unit, dose_unit)
        self.assertEqual(d50_var.unit_per_body_weight, True)

    def test_imax(self):
        parent_var = self.pkpd_model.variables.get(qname="PDCompartment.C_Drug")
        # Set unit_per_body_weight to True to test if Pmin inherits it
        parent_var.unit_per_body_weight = True
        parent_var.save()
        parent_unit = parent_var.unit
        parent_per_kg = parent_var.unit_per_body_weight

        # Set protocol with specific amount unit and per_kg
        protocol = self.project.protocols.first()
        dose_unit = Unit.objects.get(symbol="µg")
        protocol.amount_unit = dose_unit
        protocol.amount_per_body_weight = True
        protocol.save()

        DerivedVariable.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=parent_var,
            type=DerivedVariable.Type.IMAX,
        )
        self.pkpd_model = CombinedModel.objects.get(pk=self.pkpd_model.pk)
        myokit_model = self.pkpd_model.get_myokit_model()
        vars = [v.qname() for v in myokit_model.variables()]
        for var in [
            "PDCompartment.C_Drug",
            "PKNonlinearities.C_Drug",
            "PKNonlinearities.C_Drug_Imax",
            "PKNonlinearities.D50_C_Drug",
            "PKNonlinearities.hll_C_Drug",
            "PKNonlinearities.C_Drug_min",
        ]:
            self.assertIn(var, vars)
        self.assertTrue(myokit_model.get("PDCompartment.C_Drug").is_constant())
        self.assertTrue(myokit_model.get("PKNonlinearities.C_Drug_Imax").is_constant())
        self.assertEqual(
            str(myokit_model.get("PKNonlinearities.C_Drug_Imax").rhs()),
            "(PDCompartment.C_Drug - PKNonlinearities.C_Drug_min) * (1 - PKNonlinearities.C_Drug^PKNonlinearities.hll_C_Drug / (PKNonlinearities.C_Drug^PKNonlinearities.hll_C_Drug + PKNonlinearities.D50_C_Drug^PKNonlinearities.hll_C_Drug)) + PKNonlinearities.C_Drug_min",  # noqa E501
        )
        self.assertEqual(
            str(myokit_model.get("PDCompartment.PDO").rhs()),
            "PKNonlinearities.C_Drug_Imax^PDCompartment.HC / (PKNonlinearities.C_Drug_Imax^PDCompartment.HC + PDCompartment.C50^PDCompartment.HC)",  # noqa E501
        )

        # Check that Pmin has the same unit as parent
        pmin_var = self.pkpd_model.variables.get(qname="PKNonlinearities.C_Drug_min")
        self.assertEqual(pmin_var.unit, parent_unit)
        self.assertEqual(pmin_var.unit_per_body_weight, parent_per_kg)

        # Check that D50 has the same unit and unit_per_body_weight as the dose
        d50_var = self.pkpd_model.variables.get(qname="PKNonlinearities.D50_C_Drug")
        self.assertEqual(d50_var.unit, dose_unit)
        self.assertEqual(d50_var.unit_per_body_weight, True)

    def test_power(self):
        # base_variable_Power = base_variable * (C_Drug/Ref_D)**a_D
        # Set protocol with specific amount unit and per_kg
        protocol = self.project.protocols.first()
        dose_unit = Unit.objects.get(symbol="µg")
        protocol.amount_unit = dose_unit
        protocol.amount_per_body_weight = True
        protocol.save()

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
            "PKNonlinearities.C_Drug",
            "PKNonlinearities.C_Drug_Power",
            "PKNonlinearities.Ref_D_C_Drug",
            "PKNonlinearities.a_D_C_Drug",
        ]:
            self.assertIn(var, vars)
        self.assertTrue(myokit_model.get("PDCompartment.C_Drug").is_constant())
        self.assertTrue(myokit_model.get("PKNonlinearities.C_Drug_Power").is_constant())
        self.assertEqual(
            str(myokit_model.get("PKNonlinearities.C_Drug_Power").rhs()),
            "PDCompartment.C_Drug * (PKNonlinearities.C_Drug / PKNonlinearities.Ref_D_C_Drug)^PKNonlinearities.a_D_C_Drug",  # noqa E501
        )
        self.assertEqual(
            str(myokit_model.get("PDCompartment.PDO").rhs()),
            "PKNonlinearities.C_Drug_Power^PDCompartment.HC / (PKNonlinearities.C_Drug_Power^PDCompartment.HC + PDCompartment.C50^PDCompartment.HC)",  # noqa E501
        )

        # Check that Ref_D has the same unit and unit_per_body_weight as the dose
        ref_d_var = self.pkpd_model.variables.get(qname="PKNonlinearities.Ref_D_C_Drug")
        self.assertEqual(ref_d_var.unit, dose_unit)
        self.assertEqual(ref_d_var.unit_per_body_weight, True)

    def test_exp_decay(self):
        parent_var = self.pkpd_model.variables.get(qname="PDCompartment.C_Drug")
        # Set unit_per_body_weight to True to test if Pmin inherits it
        parent_var.unit_per_body_weight = True
        parent_var.save()
        parent_unit = parent_var.unit
        parent_per_kg = parent_var.unit_per_body_weight

        DerivedVariable.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=parent_var,
            type=DerivedVariable.Type.EXP_DECAY,
        )
        self.pkpd_model = CombinedModel.objects.get(pk=self.pkpd_model.pk)
        myokit_model = self.pkpd_model.get_myokit_model()
        vars = [v.qname() for v in myokit_model.variables()]
        for var in [
            "PDCompartment.C_Drug",
            "PKNonlinearities.C_Drug_TDI",
            "PKNonlinearities.k_C_Drug",
            "PKNonlinearities.C_Drug_min",
        ]:
            self.assertIn(var, vars)
        self.assertTrue(myokit_model.get("PDCompartment.C_Drug").is_constant())
        self.assertFalse(myokit_model.get("PKNonlinearities.C_Drug_TDI").is_constant())
        self.assertEqual(
            str(myokit_model.get("PKNonlinearities.C_Drug_TDI").rhs()),
            "(PDCompartment.C_Drug - PKNonlinearities.C_Drug_min) * exp(-(PKNonlinearities.k_C_Drug * environment.t)) + PKNonlinearities.C_Drug_min",  # noqa E501
        )
        self.assertEqual(
            str(myokit_model.get("PDCompartment.PDO").rhs()),
            "PKNonlinearities.C_Drug_TDI^PDCompartment.HC / (PKNonlinearities.C_Drug_TDI^PDCompartment.HC + PDCompartment.C50^PDCompartment.HC)",  # noqa E501
        )

        # Check that Pmin has the same unit as parent
        pmin_var = self.pkpd_model.variables.get(qname="PKNonlinearities.C_Drug_min")
        self.assertEqual(pmin_var.unit, parent_unit)
        self.assertEqual(pmin_var.unit_per_body_weight, parent_per_kg)

    def test_exp_growth(self):
        # base_variable_IND = base_variable * [1-exp(-k_X*time)] +Xmin
        parent_var = self.pkpd_model.variables.get(qname="PDCompartment.C_Drug")
        # Set unit_per_body_weight to True to test if Pmin inherits it
        parent_var.unit_per_body_weight = True
        parent_var.save()
        parent_unit = parent_var.unit
        parent_per_kg = parent_var.unit_per_body_weight

        DerivedVariable.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=parent_var,
            type=DerivedVariable.Type.EXP_INCREASE,
        )
        self.pkpd_model = CombinedModel.objects.get(pk=self.pkpd_model.pk)
        myokit_model = self.pkpd_model.get_myokit_model()
        vars = [v.qname() for v in myokit_model.variables()]
        for var in [
            "PDCompartment.C_Drug",
            "PKNonlinearities.C_Drug_IND",
            "PKNonlinearities.k_C_Drug",
            "PKNonlinearities.C_Drug_min",
        ]:
            self.assertIn(var, vars)
        self.assertTrue(myokit_model.get("PDCompartment.C_Drug").is_constant())
        self.assertFalse(myokit_model.get("PKNonlinearities.C_Drug_IND").is_constant())
        self.assertEqual(
            str(myokit_model.get("PKNonlinearities.C_Drug_IND").rhs()),
            "(PDCompartment.C_Drug - PKNonlinearities.C_Drug_min) * (1 - exp(-(PKNonlinearities.k_C_Drug * environment.t))) + PKNonlinearities.C_Drug_min",  # noqa E501
        )
        self.assertEqual(
            str(myokit_model.get("PDCompartment.PDO").rhs()),
            "PKNonlinearities.C_Drug_IND^PDCompartment.HC / (PKNonlinearities.C_Drug_IND^PDCompartment.HC + PDCompartment.C50^PDCompartment.HC)",  # noqa E501
        )

        # Check that Pmin has the same unit as parent
        pmin_var = self.pkpd_model.variables.get(qname="PKNonlinearities.C_Drug_min")
        self.assertEqual(pmin_var.unit, parent_unit)
        self.assertEqual(pmin_var.unit_per_body_weight, parent_per_kg)

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

    def test_area_under_curve(self):
        # Create AUC derived variable for C1 (PK concentration in compartment 1)
        DerivedVariable.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=self.pkpd_model.variables.get(
                qname="PKCompartment.C1",
            ),
            type=DerivedVariable.Type.AREA_UNDER_CURVE,
        )

        # Create AUC derived variable for E (PD effect)
        DerivedVariable.objects.create(
            pkpd_model=self.pkpd_model,
            pk_variable=self.pkpd_model.variables.get(
                qname="PDCompartment.E",
            ),
            type=DerivedVariable.Type.AREA_UNDER_CURVE,
        )

        self.pkpd_model = CombinedModel.objects.get(pk=self.pkpd_model.pk)
        myokit_model = self.pkpd_model.get_myokit_model()

        # Check that both AUC variables were created
        c1_auc_var_qname = "PKCompartment.calc_C1_AUC"
        e_auc_var_qname = "PDCompartment.calc_E_AUC"
        vars = [v.qname() for v in myokit_model.variables()]
        self.assertIn(c1_auc_var_qname, vars)
        self.assertIn(e_auc_var_qname, vars)

        # Test C1 AUC variable (PK)
        c1_auc_var = myokit_model.get(c1_auc_var_qname)
        self.assertTrue(c1_auc_var.is_state())
        self.assertEqual(
            str(c1_auc_var.rhs()),
            "PKCompartment.C1"
        )
        self.assertEqual(float(c1_auc_var.initial_value()), 0.0)

        # Test E AUC variable (PD)
        e_auc_var = myokit_model.get(e_auc_var_qname)
        self.assertTrue(e_auc_var.is_state())
        self.assertEqual(
            str(e_auc_var.rhs()),
            "PDCompartment.E"
        )
        self.assertEqual(float(e_auc_var.initial_value()), 0.0)
