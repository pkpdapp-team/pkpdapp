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
)


class TestPkpdModel(TestCase):
    def setUp(self):
        self.project = Project.objects.get(
            name="demo",
        )

        user = User.objects.get(username="demo")
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def test_combined_model_creation(self):
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
