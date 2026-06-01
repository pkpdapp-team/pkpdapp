#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.test import TestCase
from pkpdapp.models import (
    PharmacodynamicModel,
    Protocol,
    PharmacokineticModel,
    CombinedModel,
    Dose,
    Unit,
)
import myokit
from django.core.exceptions import ValidationError
from django.core.cache import cache
import numpy as np


class TestPharmodynamicModel(TestCase):
    def setUp(self):
        cache.clear()

    def test_model_bad_mmt(self):
        with self.assertRaises(myokit.ParseError):
            PharmacodynamicModel.objects.create(
                name="my_cool_model",
                description="description for my cool model",
                mmt="this is not sbml",
            )

    def test_model_clean(self):
        m = PharmacodynamicModel(
            name="my_cool_model",
            description="description for my cool model",
            mmt="this is not xml",
        )
        with self.assertRaises(ValidationError):
            m.clean()

    def test_model_creation(self):
        m = PharmacodynamicModel.objects.create(
            name="my_cool_model",
            description="description for my cool model",
        )
        self.assertTrue(isinstance(m, PharmacodynamicModel))

    def test_myokit_model(self):
        m = PharmacodynamicModel.objects.get(
            name="tumour_growth_gompertz",
        )
        model = m.get_myokit_model()
        model_variables = [v.name() for v in model.variables()]
        test_model_variables = ["TS0", "TSmax", "beta", "Growth", "TS", "t"]
        self.assertCountEqual(model_variables, test_model_variables)


class TestDosedPharmokineticModel(TestCase):
    def setUp(self):
        cache.clear()
        self.pk = PharmacokineticModel.objects.get(
            name="one_compartment_clinical",
        )

        self.model = CombinedModel.objects.create(
            pk_model=self.pk,
        )

        v = self.model.variables.get(qname="PKCompartment.A1")
        self.p = Protocol.objects.create(
            amount_unit=Unit.objects.get(symbol="pmol"),
            time_unit=Unit.objects.get(symbol="h"),
            name="my_cool_protocol",
            dose_type=Protocol.DoseType.INDIRECT,
            variable=v,
        )

    def test_reset_to_default(self):
        v = self.model.variables.get(qname="PKCompartment.CL")
        self.assertNotEqual(v.default_value, 8)
        self.assertNotEqual(v.unit.symbol, "mL/h")

        self.model.reset_params_to_defaults("H", "LM")

        v = self.model.variables.get(qname="PKCompartment.CL")
        self.assertEqual(v.default_value, 8)
        self.assertEqual(v.unit.symbol, "mL/h")

    def test_myokit_model(self):
        model = self.model.get_myokit_model()
        pk_model = self.pk.get_myokit_model()
        model_variables = [v.name() for v in model.variables()]
        pk_model_variables = [v.name() for v in pk_model.variables()]

        # check that the absorption_rate and dose_rate variable has been added,
        # and the extra drug_amount state variable
        self.assertCountEqual(
            model_variables,
            pk_model_variables,
        )

        # run a simulation with a a dose events
        Dose.objects.create(
            protocol=self.p,
            start_time=0,
            duration=0.1,
            amount=1000,
        )

        # dosed model should have a concentration at t ~ 0.5
        # of greater than 0.01
        output = self.model.simulate(
            outputs=["PKCompartment.C1", "environment.t"],
            time_max=self.model.time_max,
            use_diffsol=False,
        )[0]
        time_id = self.model.variables.get(qname="environment.t").id
        c1_id = self.model.variables.get(qname="PKCompartment.C1").id
        index = np.where(np.array(output[time_id]) > 0.5)[0][0]
        self.assertGreater(
            output[c1_id][index],
            0.01,
        )

        # non-dosed model should have a concentration at t ~ 0.5 of near zero
        output = self.pk.simulate(
            outputs=["PKCompartment.C1", "environment.t"],
            time_max=self.pk.time_max,
            use_diffsol=False,
        )[0]
        time_id = self.pk.variables.get(qname="environment.t").id
        c1_id = self.pk.variables.get(qname="PKCompartment.C1").id
        index = np.where(np.array(output[time_id]) > 0.5)[0][0]
        self.assertLess(
            output[c1_id][index],
            1e-6,
        )
