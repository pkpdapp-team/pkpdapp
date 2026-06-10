#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from unittest import mock

from django.test import TestCase
import numpy as np

from pkpdapp.models import Dose, Variable
from pkpdapp.models.optimise_context import OptimiseContext
from pkpdapp.models.simulate_context import SimulateContext
from pkpdapp.tests.optimise_fixtures import SELECTED_TIMES, create_exponential_data


class TestSimulateContext(TestCase):
    def test_context_collects_simulation_and_optimisation_data(self):
        setup = create_exponential_data(
            name_prefix="simulate_context",
            group_name_prefix="Context",
            rng_seed=12345,
        )
        model = setup["model"]
        input_variables = setup["inputs"]

        context = SimulateContext(
            model,
            outputs=["Central.response", "environment.t"],
            variables={"Central.k": 0.25},
            time_max=12,
        )
        optimise_context = OptimiseContext(
            model,
            outputs=["Central.response", "environment.t"],
            variables={"Central.k": 0.25},
            time_max=12,
            optimise_inputs=[variable.id for variable in input_variables],
            starting=[0.2, 1.5],
            bounds=([0.1, 1.0], [0.4, 2.5]),
            biomarker_types=[setup["biomarker_type"].id],
            subject_groups=[group.id for group in setup["groups"]],
        )
        diffsol_context = SimulateContext(
            model,
            outputs=["Central.response", "environment.t"],
            variables={"Central.k": 0.25},
            use_diffsol=True,
            time_max=12,
        )
        dynamic_context = SimulateContext(
            model,
            outputs=["Central.response", "environment.t"],
            variables={"Central.k": 0.25},
            time_max=12,
            dynamic_inputs=[input_variables[0].id],
        )

        self.assertEqual(context.model_id, model.id)
        self.assertEqual(context.project_id, model.project_id)
        self.assertEqual(context.time_qname, "environment.t")
        self.assertEqual(context.time_max, 12)
        self.assertEqual(context.variable_values["Central.k"].value, 0.25)
        self.assertEqual(
            [output.qname for output in context.outputs],
            ["Central.response", "environment.t"],
        )

        self.assertEqual(len(context.simulation_groups), 3)
        self.assertEqual(context.simulation_groups[0].group_id, None)
        self.assertEqual(len(context.simulation_groups[0].dosing_protocols), 0)
        self.assertIsNone(context.simulation_groups[0].diffsol_ode)
        for group_context in context.simulation_groups[1:]:
            self.assertEqual(len(group_context.dosing_protocols), 1)
            self.assertEqual(len(group_context.dosing_protocols[0].events), 2)

        self.assertEqual(len(diffsol_context.simulation_groups), 3)
        for group_context in diffsol_context.simulation_groups:
            self.assertIsNotNone(group_context.diffsol_ode)

        self.assertFalse(hasattr(context, "optimisation_groups"))

        self.assertEqual(len(optimise_context.optimisation_groups), 2)
        for group_context in optimise_context.optimisation_groups:
            self.assertEqual(
                [output.qname for output in group_context.outputs],
                ["Central.response"],
            )
            self.assertEqual(
                group_context.t_eval,
                tuple(float(t) for t in SELECTED_TIMES),
            )
            self.assertEqual(len(group_context.records), len(SELECTED_TIMES))

        starting_values = {
            variable.id: value for variable, value in zip(input_variables, [0.2, 1.5])
        }
        true_values = {
            variable.id: value for variable, value in zip(input_variables, [0.22, 1.7])
        }
        starting_prediction = optimise_context._optimise_predict(
            optimise_context.optimisation_groups[0],
            starting_values,
        )
        true_prediction = optimise_context._optimise_predict(
            optimise_context.optimisation_groups[0],
            true_values,
        )
        self.assertEqual(
            starting_prediction.shape,
            (1, len(SELECTED_TIMES)),
        )
        self.assertEqual(
            true_prediction.shape,
            (1, len(SELECTED_TIMES)),
        )

        y, y_prime = optimise_context._optimise_predict_with_sens(
            optimise_context.optimisation_groups[0],
            starting_values,
        )
        self.assertEqual(y.shape, (len(SELECTED_TIMES), 1))
        self.assertEqual(y_prime.shape, (len(SELECTED_TIMES), 1, 2))
        self.assertTrue(np.all(np.isfinite(y)))
        self.assertTrue(np.all(np.isfinite(y_prime)))

        starting_loss = optimise_context._optimise_loss(
            optimise_context.optimisation_groups,
            starting_values,
        )
        true_loss = optimise_context._optimise_loss(
            optimise_context.optimisation_groups,
            true_values,
        )
        self.assertTrue(np.isfinite(starting_loss))
        self.assertTrue(np.isfinite(true_loss))
        self.assertLess(true_loss, starting_loss)

        (total_loss, total_gradient, ssr, n_obs) = (
            optimise_context._optimise_loss_gradient(
                optimise_context.optimisation_groups,
                starting_values,
            )
        )
        self.assertTrue(np.isfinite(total_loss))
        self.assertEqual(total_gradient.shape, (2,))
        self.assertTrue(np.all(np.isfinite(total_gradient)))

        simulation_group = context.simulation_groups[1]
        expected_myokit = model.simulate(
            outputs=["Central.response", "environment.t"],
            variables={"Central.k": 0.25},
            time_max=12,
            use_diffsol=False,
        )[1]
        expected_myokit.pop("group_id")
        self.assertEqual(context.simulate_model(simulation_group), expected_myokit)

        expected_diffsol = model.simulate(
            outputs=["Central.response", "environment.t"],
            variables={"Central.k": 0.25},
            time_max=12,
            use_diffsol=True,
        )[1]
        expected_diffsol.pop("group_id")
        self.assertEqual(
            diffsol_context.simulate_model(diffsol_context.simulation_groups[1]),
            expected_diffsol,
        )

        baseline_dynamic = dynamic_context.simulate_model(
            dynamic_context.simulation_groups[1]
        )
        overridden_dynamic = dynamic_context.simulate_model(
            dynamic_context.simulation_groups[1],
            values_by_id={input_variables[0].id: 0.3},
        )
        reset_dynamic = dynamic_context.simulate_model(
            dynamic_context.simulation_groups[1]
        )
        self.assertEqual(
            set(baseline_dynamic.keys()),
            set(overridden_dynamic.keys()),
        )
        self.assertNotEqual(baseline_dynamic, overridden_dynamic)
        self.assertEqual(baseline_dynamic, reset_dynamic)

        self.assertFalse(hasattr(context, "_project"))
        self.assertFalse(hasattr(context, "_variables_by_qname"))
        self.assertFalse(hasattr(context, "_variables_by_id"))
        self.assertFalse(hasattr(context, "_protocols"))
        self.assertFalse(hasattr(context, "_model"))
        self.assertFalse(hasattr(context, "default_variables"))

    def test_invalid_variable_references_raise(self):
        setup = create_exponential_data(
            name_prefix="simulate_context_invalid",
            group_name_prefix="Invalid",
        )
        model = setup["model"]

        with self.assertRaises(Variable.DoesNotExist):
            SimulateContext(model, outputs=["Central.missing"])

        with self.assertRaises(Variable.DoesNotExist):
            SimulateContext(model, variables={"Central.missing": 1.0})

        context = SimulateContext(model, outputs=["Central.response"])
        with self.assertRaises(Variable.DoesNotExist):
            context.get_variable_context("Central.missing")

    def test_dynamic_input_validation(self):
        setup = create_exponential_data(
            name_prefix="simulate_context_dynamic",
            group_name_prefix="Dynamic",
        )
        model = setup["model"]
        k, _ = setup["inputs"]
        amount = model.variables.get(qname="Central.amount")
        missing_id = max(variable.id for variable in model.variables.all()) + 1000

        with self.assertRaisesMessage(ValueError, "Dynamic inputs must be unique."):
            SimulateContext(model, dynamic_inputs=[k.id, k.id])

        with self.assertRaises(Variable.DoesNotExist):
            SimulateContext(model, dynamic_inputs=[missing_id])

        with self.assertRaisesMessage(ValueError, "must be a constant variable"):
            SimulateContext(model, dynamic_inputs=[amount.id])

    def test_dosing_protocol_context_builds_events_and_group_ordering(self):
        setup = create_exponential_data(
            name_prefix="simulate_context_dosing",
            group_name_prefix="Dose",
        )
        model = setup["model"]
        group = setup["groups"][0]
        protocol = group.protocols.get()
        protocol.doses.all().delete()

        Dose.objects.create(
            protocol=protocol,
            start_time=0.0,
            amount=10.0,
            duration=0.1,
            repeats=1,
            repeat_interval=1.0,
        )
        Dose.objects.create(
            protocol=protocol,
            start_time=0.2,
            amount=5.0,
            duration=0.1,
            repeats=3,
            repeat_interval=0.4,
        )
        Dose.objects.create(
            protocol=protocol,
            start_time=1.2,
            amount=2.0,
            duration=0.1,
            repeats=1,
            repeat_interval=1.0,
        )
        Dose.objects.create(
            protocol=protocol,
            start_time=1.15,
            amount=2.0,
            duration=0.05,
            repeats=1,
            repeat_interval=1.0,
        )
        Dose.objects.create(
            protocol=protocol,
            start_time=0.4,
            amount=99.0,
            duration=0.1,
            repeats=3,
            repeat_interval=0.0,
        )

        context = SimulateContext(
            model,
            outputs=["Central.response"],
            time_max=1.2,
        )

        self.assertEqual(
            [group_context.group_name for group_context in context.simulation_groups],
            [None, "Dose-Group 1", "Dose-Group 2"],
        )
        group_context = next(
            group_context
            for group_context in context.simulation_groups
            if group_context.group_id == group.id
        )
        protocol_context = group_context.dosing_protocols[0]
        self.assertEqual(protocol_context.pacing_label, "pace_Central_amount")
        self.assertEqual(len(protocol_context.events), 6)

        starts = [event.start for event in protocol_context.events]
        levels = [event.level for event in protocol_context.events]
        self.assertTrue(np.allclose(starts[:4], [0.0, 0.2, 0.6, 1.0]))
        self.assertAlmostEqual(protocol_context.events[0].level, 100.0)
        self.assertAlmostEqual(protocol_context.events[0].duration, 0.1)
        self.assertNotIn(990.0, levels)
        self.assertIn(1.2, starts)
        self.assertAlmostEqual(protocol_context.events[-1].duration, 0.05)

    def test_diffsol_ode_cache_reuses_ode_for_same_content(self):
        setup = create_exponential_data(
            name_prefix="simulate_context_cache",
            group_name_prefix="Cache",
        )
        context = SimulateContext(setup["model"], outputs=["Central.response"])

        class FakeOde:
            created = []

            def __init__(self, content):
                self.content = content
                FakeOde.created.append(self)

        class FakeCache:
            def __init__(self):
                self.values = {}

            def get(self, key):
                return self.values.get(key)

            def set(self, key, value, timeout=None):
                self.values[key] = value

        fake_cache = FakeCache()
        with (
            mock.patch("pkpdapp.models.simulate_context.cache", fake_cache),
            mock.patch("pkpdapp.models.simulate_context.pydiffsol.Ode", FakeOde),
        ):
            first = context._get_cached_diffsol_ode("ode-content")
            second = context._get_cached_diffsol_ode("ode-content")
            third = context._get_cached_diffsol_ode("other-content")

        self.assertIs(first, second)
        self.assertIsNot(first, third)
        self.assertEqual([ode.content for ode in FakeOde.created], [
            "ode-content",
            "other-content",
        ])
        self.assertEqual(first.ode_solver, third.ode_solver)
        self.assertNotEqual(
            context._diffsol_ode_cache_key("ode-content"),
            context._diffsol_ode_cache_key("other-content"),
        )
