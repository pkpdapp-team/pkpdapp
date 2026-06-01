#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase
import numpy as np

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

        total_loss, total_gradient = optimise_context._optimise_loss_gradient(
            optimise_context.optimisation_groups,
            starting_values,
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

        self.assertFalse(hasattr(context, "_project"))
        self.assertFalse(hasattr(context, "_variables_by_qname"))
        self.assertFalse(hasattr(context, "_variables_by_id"))
        self.assertFalse(hasattr(context, "_protocols"))
        self.assertFalse(hasattr(context, "_model"))
        self.assertFalse(hasattr(context, "default_variables"))
