#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.test import TestCase

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
            optimise_inputs=[variable.id for variable in input_variables],
            starting=[0.2, 1.5],
            bounds=([0.1, 1.0], [0.4, 2.5]),
            biomarker_types=[setup["biomarker_type"].id],
            subject_groups=[group.id for group in setup["groups"]],
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
        for group_context in context.simulation_groups[1:]:
            self.assertEqual(len(group_context.dosing_protocols), 1)
            self.assertEqual(len(group_context.dosing_protocols[0].events), 2)

        self.assertEqual(
            [input_context.qname for input_context in context.optimise_inputs],
            ["Central.k", "Central.scale"],
        )
        self.assertEqual(context.optimise_inputs[0].starting, 0.2)
        self.assertEqual(context.optimise_inputs[0].lower_bound, 0.1)
        self.assertEqual(context.optimise_inputs[0].upper_bound, 0.4)

        self.assertEqual(len(context.optimisation_groups), 2)
        for group_context in context.optimisation_groups:
            self.assertEqual(
                [output.qname for output in group_context.outputs],
                ["Central.response"],
            )
            self.assertEqual(
                group_context.t_eval,
                tuple(float(t) for t in SELECTED_TIMES),
            )
            self.assertEqual(len(group_context.records), len(SELECTED_TIMES))
            self.assertIn("Central.k", group_context.input_values)
            self.assertIn("Central.scale", group_context.input_values)

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
            context.simulate_model_diffsol(simulation_group),
            expected_diffsol,
        )

        self.assertFalse(hasattr(context, "_project"))
        self.assertFalse(hasattr(context, "_variables_by_qname"))
        self.assertFalse(hasattr(context, "_variables_by_id"))
        self.assertFalse(hasattr(context, "_protocols"))
        self.assertFalse(hasattr(context, "_model"))
        self.assertFalse(hasattr(context, "default_variables"))
