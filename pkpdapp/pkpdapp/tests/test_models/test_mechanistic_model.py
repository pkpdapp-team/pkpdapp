#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.test import TestCase
from pkpdapp.models import (
    PharmacodynamicModel, Protocol, PharmacokineticModel,
    CombinedModel,
    Dose, Unit,
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
                name='my_cool_model',
                description='description for my cool model',
                mmt='this is not sbml'
            )

    def test_model_clean(self):
        m = PharmacodynamicModel(
            name='my_cool_model',
            description='description for my cool model',
            mmt='this is not xml'
        )
        with self.assertRaises(ValidationError):
            m.clean()

    def test_model_creation(self):
        m = PharmacodynamicModel.objects.create(
            name='my_cool_model',
            description='description for my cool model',
        )
        self.assertTrue(isinstance(m, PharmacodynamicModel))

    def test_myokit_model(self):
        m = PharmacodynamicModel.objects.get(
            name='tumour_growth_gompertz',
        )
        model = m.get_myokit_model()
        model_variables = [v.name() for v in model.variables()]
        test_model_variables = [
            'TS0', 'TSmax', 'beta',
            'Growth', 'TS', 't'
        ]
        self.assertCountEqual(model_variables, test_model_variables)


class TestDosedPharmokineticModel(TestCase):
    def setUp(self):
        cache.clear()
        self.pk = PharmacokineticModel.objects.get(
            name='one_compartment_clinical',
        )

        self.model = CombinedModel.objects.create(
            pk_model=self.pk,
        )

        self.p = Protocol.objects.create(
            amount_unit=Unit.objects.get(symbol='pmol'),
            time_unit=Unit.objects.get(symbol='h'),
            name='my_cool_protocol',
            dose_type=Protocol.DoseType.INDIRECT,
        )

        v = self.model.variables.get(qname='PKCompartment.A1')
        v.protocol = self.p
        v.save()

    def test_store_model(self):
        stored_model = self.model.create_stored_model()
        self.assertTrue(isinstance(stored_model, CombinedModel))
        self.assertTrue(stored_model.read_only)
        self.assertEqual(
            len(stored_model.variables.all()),
            len(self.model.variables.all())
        )
        v = stored_model.variables.get(qname='PKCompartment.A1')
        self.assertEqual(v.protocol.name, 'my_cool_protocol')
        self.assertNotEqual(v.protocol.id, self.p.id)

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
        sim = self.model.get_myokit_simulator()

        output = sim.run(self.model.time_max)
        index = np.where(np.array(output['environment.t']) > 0.5)[0][0]
        self.assertGreater(output['PKCompartment.C1'][index], 0.01)

        # non-dosed model should have a concentration at t ~ 0.5 of near zero
        pk_sim = self.pk.get_myokit_simulator()
        output = pk_sim.run(self.pk.time_max)
        index = np.where(np.array(output['environment.t']) > 0.5)[0][0]
        self.assertLess(output['PKCompartment.C1'][index], 1e-6)
