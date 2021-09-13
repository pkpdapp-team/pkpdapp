#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
from pkpdapp.models import (
    PharmacodynamicModel, Protocol, PharmacokineticModel,
    Compound, DosedPharmacokineticModel,
    Dose, PkpdModel, Unit
)
from django.core.cache import cache
import numpy as np


class TestPharmodynamicModel(TestCase):
    def setUp(self):
        cache.clear()

    def test_model_creation(self):
        m = PharmacodynamicModel.objects.create(
            name='my_cool_model',
            description='description for my cool model',
            sbml='sbml_here',
        )
        self.assertTrue(isinstance(m, PharmacodynamicModel))

    def test_myokit_model(self):

        m = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
        )
        model = m.get_myokit_model()
        model_variables = [v.name() for v in model.variables()]
        test_model_variables = [
            'tumour_volume', 'lambda_0', 'lambda_1',
            'kappa', 'drug_concentration', 'time'
        ]
        self.assertCountEqual(model_variables, test_model_variables)

    def test_variable_creation(self):
        m = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
        )
        m.save()
        m = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
        )
        model_variables = m.variables.values_list('name', flat=True)
        test_model_variables = [
            'tumour_volume', 'lambda_0', 'lambda_1',
            'kappa', 'drug_concentration', 'time'
        ]
        self.assertCountEqual(model_variables, test_model_variables)

    def test_component_serialisation(self):
        m = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
        )
        components = m.components()
        print(components)
        self.assertEqual(len(components), 1)
        self.assertIn('name', components[0])
        self.assertIn('states', components[0])
        self.assertIn('variables', components[0])
        self.assertIn('outputs', components[0])
        self.assertIn('equations', components[0])

    def test_simulate(self):
        m = PharmacodynamicModel.objects.get(
            name='tumour_growth_inhibition_model_koch',
        )

        variables = [v['qname'] for v in m.variables()]
        test_model_variables = [
            'myokit.lambda_0', 'myokit.lambda_1',
            'myokit.kappa', 'myokit.drug_concentration'
        ]
        self.assertCountEqual(variables, test_model_variables)

        states = [s['qname'] for s in m.states()]
        test_model_states = ['myokit.tumour_volume']
        self.assertCountEqual(states, test_model_states)

        outpts = [o['qname'] for o in m.outputs()]
        test_model_outputs = ['myokit.tumour_volume', 'myokit.time']
        self.assertCountEqual(outpts, test_model_outputs)

        outputs = outpts
        initial_conditions = {s: 1.1 for s in test_model_states}
        variables = {v: 0.5 for v in test_model_variables}
        result = m.simulate(outputs, initial_conditions, variables)
        self.assertEqual(result[test_model_outputs[0]][0], 1.1)
        self.assertEqual(result[test_model_outputs[1]][0], 0.0)


class TestDosedPharmokineticModel(TestCase):
    def setUp(self):
        cache.clear()

    def test_model_creation(self):
        pk = PharmacokineticModel.objects\
            .get(name='one_compartment_pk_model')

        c = Compound.objects.create(
            name='test_dosed_pk_model',
            description='placebo',
        )

        p = Protocol.objects.create(
            name='my_cool_protocol',
            compound=c,
            subject_id=1,
            amount_unit=Unit.objects.get(symbol='mg'),
            time_unit=Unit.objects.get(symbol='h'),
        )

        m = DosedPharmacokineticModel.objects.create(
            pharmacokinetic_model=pk,
            dose_compartment='central',
            protocol=p,
        )
        self.assertTrue(isinstance(m, DosedPharmacokineticModel))

    def test_myokit_model(self):
        pk = PharmacokineticModel.objects.get(
            name='one_compartment_pk_model',
        )

        p = Protocol.objects.create(
            amount_unit=Unit.objects.get(symbol='mg'),
            time_unit=Unit.objects.get(symbol='h'),
            name='my_cool_protocol',
            dose_type=Protocol.DoseType.INDIRECT,
        )

        m = DosedPharmacokineticModel.objects.create(
            pharmacokinetic_model=pk,
            dose_compartment='central',
            protocol=p,
        )

        model = m.get_myokit_model()
        pk_model = pk.get_myokit_model()
        model_variables = [v.name() for v in model.variables()]
        pk_model_variables = [v.name() for v in pk_model.variables()]
        model_components = [c.name() for c in model.components()]
        pk_model_components = [c.name() for c in pk_model.components()]

        # check that the absorption_rate and dose_rate variable has been added,
        # and the extra drug_amount state variable
        self.assertCountEqual(
            model_variables,
            pk_model_variables +
            ['absorption_rate', 'drug_amount', 'dose_rate']
        )
        # check that the dose compartment has been added
        self.assertCountEqual(
            model_components, pk_model_components + ['dose']
        )

        # run a simulation with a a dose events
        Dose.objects.create(
            protocol=p,
            start_time=0,
            duration=0.1,
            amount=1,
        )

        # dosed model should have a concentration at t ~ 0.5
        # of greater than 0.01
        sim = m.get_myokit_simulator()
        output = sim.run(m.time_max)
        index = np.where(np.array(output['myokit.time']) > 0.5)[0][0]
        self.assertGreater(output['central.drug_concentration'][index], 0.01)

        # non-dosed model should have a concentration at t ~ 0.5 of near zero
        pk_sim = pk.get_myokit_simulator()
        output = pk_sim.run(pk.time_max)
        index = np.where(np.array(output['myokit.time']) > 0.5)[0][0]
        self.assertLess(output['central.drug_concentration'][index], 1e-6)

    def test_simulate(self):
        pk = PharmacokineticModel.objects.get(
            name='one_compartment_pk_model',
        )

        p = Protocol.objects.create(
            amount_unit=Unit.objects.get(symbol='mg'),
            time_unit=Unit.objects.get(symbol='h'),
            name='my_cool_protocol',
            dose_type=Protocol.DoseType.INDIRECT,
        )

        m = DosedPharmacokineticModel.objects.create(
            pharmacokinetic_model=pk,
            dose_compartment='central',
            protocol=p,
        )

        Dose.objects.create(
            protocol=p,
            start_time=0,
            duration=0.1,
            amount=1,
        )

        variables = [v['qname'] for v in m.variables()]
        test_model_variables = [
            'central.size', 'dose.absorption_rate',
            'myokit.clearance'
        ]
        self.assertCountEqual(variables, test_model_variables)

        states = [s['qname'] for s in m.states()]
        test_model_states = ['central.drug_amount', 'dose.drug_amount']
        self.assertCountEqual(states, test_model_states)

        outpts = [o['qname'] for o in m.outputs()]
        test_model_outputs = [
            'central.drug_amount', 'central.drug_concentration',
            'dose.dose_rate', 'dose.drug_amount', 'myokit.time'
        ]
        self.assertCountEqual(outpts, test_model_outputs)

        outputs = test_model_outputs
        initial_conditions = {s: 1.1 for s in test_model_states}
        variables = {v: 0.5 for v in test_model_variables}
        result = m.simulate(outputs, initial_conditions, variables)
        self.assertEqual(result[test_model_outputs[0]][0], 1.1)
        self.assertEqual(result[test_model_outputs[-1]][0], 0.0)


class TestPkpdModel(TestCase):
    def test_pkpd_model_creation(self):
        c = Compound.objects.create(
            name='test_pkpd_model_creation',
            description='placebo',
        )

        p = Protocol.objects.create(
            name='my_cool_protocol',
            compound=c,
            subject_id=1,
            amount_unit=Unit.objects.get(symbol='mg'),
            time_unit=Unit.objects.get(symbol='h'),
        )
        m = PkpdModel.objects.create(
            name='my_cool_model',
            sbml='sbml_here',
            dose_compartment='central',
            protocol=p,
        )
        self.assertTrue(isinstance(m, PkpdModel))
