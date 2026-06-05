#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from dataclasses import replace
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

import numpy as np
from django.test import TestCase
from pkpdapp.models.optimise_context import OptimiseContext
from pkpdapp.models import (
    Biomarker,
    BiomarkerType,
    Subject,
    SubjectGroup,
    Unit,
    Variable,
)
from pkpdapp.tests.optimise_fixtures import (
    SELECTED_TIMES,
    create_exponential_data,
)


class FakeDiffsolOde:
    def __init__(
        self,
        y,
        sens=None,
        raise_dense=False,
        raise_sens=False,
    ):
        self.y = np.asarray(y, dtype=float)
        self.sens = sens
        self.raise_dense = raise_dense
        self.raise_sens = raise_sens

    def solve_dense(self, input_values, t_eval):
        if self.raise_dense:
            raise RuntimeError("dense solve failed")
        return SimpleNamespace(ys=self.y)

    def solve_fwd_sens(self, input_values, t_eval):
        if self.raise_sens:
            raise RuntimeError("sensitivity solve failed")
        return SimpleNamespace(ys=self.y, sens=self.sens)


class TestOptimise(TestCase):
    def _build_optimise_context(self, setup, starting, bounds):
        return OptimiseContext(
            model=setup["model"],
            optimise_inputs=[variable.id for variable in setup["inputs"]],
            starting=starting,
            bounds=bounds,
            biomarker_types=[setup["biomarker_type"].id],
            subject_groups=[group.id for group in setup["groups"]],
            use_diffsol=True,
        )

    def _to_model_space_values_by_id(self, context, input_ids, values):
        conversion_factors = np.asarray(
            [
                context.get_variable_context(
                    context.get_input_name(input_id)
                ).conversion_factor
                for input_id in input_ids
            ],
            dtype=float,
        )
        model_values = np.asarray(values, dtype=float) * conversion_factors
        return {
            input_id: float(value)
            for input_id, value in zip(input_ids, model_values)
        }

    def _starting_values_by_id(self, context, setup, starting=None):
        input_ids = [variable.id for variable in setup["inputs"]]
        return self._to_model_space_values_by_id(
            context,
            input_ids,
            starting or [0.27, 1.45],
        )

    def _fake_sens(self, context, group, value=0.1):
        return [
            np.full((len(group.outputs), len(group.t_eval)), value, dtype=float)
            for _ in context.inputs
        ]

    def _exponential_data(self):
        setup = create_exponential_data(
            name_prefix="optimise", group_name_prefix="Data", rng_seed=12345
        )
        self._write_manual_verification_plots(setup["plot_data"])
        return setup

    def _write_manual_verification_plots(self, plot_data):
        try:
            import matplotlib

            matplotlib.use("Agg")
            import matplotlib.pyplot as plt
        except ImportError:
            return

        output_dir = Path(__file__).parent / "optimise_verification_plots"
        output_dir.mkdir(parents=True, exist_ok=True)
        fig, ax = plt.subplots()
        for group_name, sim_times, sim_values, data_times, data_values in plot_data:
            ax.plot(
                sim_times,
                sim_values,
                label=f"{group_name} true",
            )
            ax.scatter(
                data_times,
                data_values,
                label=f"{group_name} data",
            )
        ax.set_xlabel("Time (h)")
        ax.set_ylabel("Response")
        ax.legend()
        fig.tight_layout()
        fig.savefig(output_dir / "exponential_decay.svg", format="svg")
        plt.close(fig)

    def _write_optimise_prediction_plots(
        self,
        prepared_groups,
        true_predictions,
        starting_predictions,
    ):
        try:
            import matplotlib

            matplotlib.use("Agg")
            import matplotlib.pyplot as plt
        except ImportError:
            return

        output_dir = Path(__file__).parent / "optimise_verification_plots"
        output_dir.mkdir(parents=True, exist_ok=True)

        fig, axes = plt.subplots(len(prepared_groups), 1, squeeze=False)
        for index, (group, true_prediction, starting_prediction) in enumerate(
            zip(prepared_groups, true_predictions, starting_predictions)
        ):
            axis = axes[index, 0]

            time_values = np.asarray(group.t_eval, dtype=float)
            axis.plot(
                time_values, true_prediction[0], label="True parameter prediction"
            )
            axis.plot(
                time_values,
                starting_prediction[0],
                label="Starting parameter prediction",
            )

            record_times = [
                record.time for record in group.records if record.output_index == 0
            ]
            record_values = [
                record.value for record in group.records if record.output_index == 0
            ]
            axis.scatter(record_times, record_values, label="Observed data", s=15)
            axis.set_xlabel("Time (h)")
            axis.set_ylabel(group.outputs[0].qname)
            axis.set_title(f"Group {index + 1}")
            axis.legend()

        fig.tight_layout()
        fig.savefig(output_dir / "optimise_predictions.svg", format="svg")
        plt.close(fig)

    # tests the myokit_model_mixin.optimise method on the exponential model and data
    # the bounds used are tight and the initial guess is close to the true values,
    # so the optimisation should succeed
    def test_optimise(self):
        setup = self._exponential_data()
        model = setup["model"]
        input_ids = [variable.id for variable in setup["inputs"]]
        true_values = setup["true"]
        starting = [0.27, 1.45]
        bounds = ([0.16, 1.2], [0.3, 2.1])
        group_ids = [group.id for group in setup["groups"]]
        biomarker_type_ids = [setup["biomarker_type"].id]

        context = self._build_optimise_context(
            setup,
            starting,
            bounds,
        )
        prepared_groups = context.optimisation_groups
        starting_values_by_id = self._to_model_space_values_by_id(
            context,
            input_ids,
            starting,
        )
        true_values_by_id = self._to_model_space_values_by_id(
            context,
            input_ids,
            true_values,
        )

        starting_predictions = [
            context.optimise_predict(group, starting_values_by_id)
            for group in prepared_groups
        ]

        true_predictions = [
            context.optimise_predict(group, true_values_by_id)
            for group in prepared_groups
        ]

        for true_prediction, starting_prediction, group in zip(
            true_predictions,
            starting_predictions,
            prepared_groups,
        ):
            expected_shape = (len(group.outputs), len(group.t_eval))
            self.assertEqual(true_prediction.shape, expected_shape)
            self.assertEqual(starting_prediction.shape, expected_shape)

        self._write_optimise_prediction_plots(
            prepared_groups,
            true_predictions,
            starting_predictions,
        )

        starting_loss = context.optimise_loss(
            prepared_groups,
            starting_values_by_id,
        )
        true_loss = context.optimise_loss(
            prepared_groups,
            true_values_by_id,
        )

        self.assertLess(true_loss, starting_loss)

        result = model.optimise(
            inputs=input_ids,
            starting=starting,
            bounds=bounds,
            biomarker_types=biomarker_type_ids,
            subject_groups=group_ids,
            max_iterations=80,
        )

        self.assertTrue(np.isfinite(result["loss"]))
        self.assertLess(result["loss"], starting_loss)
        self.assertAlmostEqual(result["optimal"][0], true_values[0], delta=0.04)
        self.assertAlmostEqual(result["optimal"][1], true_values[1], delta=0.18)

    def test_optimise_validation(self):
        setup = self._exponential_data()
        model = setup["model"]
        input_ids = [variable.id for variable in setup["inputs"]]

        result = model.optimise(
            inputs=input_ids[:1],
            starting=[0.2],
            bounds=([0.1], [0.3]),
            biomarker_types=[setup["biomarker_type"].id],
            subject_groups=[setup["groups"][0].id],
            max_iterations=25,
        )
        self.assertEqual(len(result["optimal"]), 1)
        self.assertTrue(np.isfinite(result["loss"]))

        with self.assertRaises(ValueError):
            model.optimise(
                inputs=input_ids,
                starting=[0.2, 1.5],
                bounds=([0.3, 1.0], [0.1, 2.0]),
                biomarker_types=[setup["biomarker_type"].id],
                subject_groups=[setup["groups"][0].id],
                max_iterations=1,
            )

    def test_optimise_context_input_validation_branches(self):
        setup = create_exponential_data(
            name_prefix="optimise_context_validation",
            group_name_prefix="Validation",
        )
        model = setup["model"]
        input_ids = [variable.id for variable in setup["inputs"]]

        def build(inputs, starting, bounds):
            return OptimiseContext(
                model=model,
                optimise_inputs=inputs,
                starting=starting,
                bounds=bounds,
                biomarker_types=[setup["biomarker_type"].id],
                subject_groups=[setup["groups"][0].id],
            )

        invalid_cases = [
            ([], [], ([], []), "at least one input"),
            (
                [input_ids[0], input_ids[0]],
                [0.2, 0.2],
                ([0.1, 0.1], [0.3, 0.3]),
                "unique",
            ),
            (input_ids, [0.2], ([0.1, 1.0], [0.3, 2.0]), "same length as inputs"),
            (
                input_ids,
                [0.2, 1.5],
                ([0.1, 1.0], [0.3, 2.0], [0.4, 3.0]),
                "pair of lower and upper",
            ),
            (input_ids, [0.2, 1.5], ([0.1], [0.3, 2.0]), "same length as inputs"),
            (input_ids, [0.2, 1.5], ([0.3, 1.0], [0.1, 2.0]), "less than upper"),
            (input_ids, [0.05, 1.5], ([0.1, 1.0], [0.3, 2.0]), "within bounds"),
        ]
        for inputs, starting, bounds, message in invalid_cases:
            with self.subTest(message=message):
                with self.assertRaisesMessage(ValueError, message):
                    build(inputs, starting, bounds)

    def test_optimise_context_biomarker_and_group_validation(self):
        setup = create_exponential_data(
            name_prefix="optimise_context_biomarkers",
            group_name_prefix="Biomarker",
        )
        model = setup["model"]
        input_ids = [variable.id for variable in setup["inputs"]]
        base_kwargs = {
            "model": model,
            "optimise_inputs": input_ids,
            "starting": [0.2, 1.5],
            "bounds": ([0.1, 1.0], [0.3, 2.0]),
            "subject_groups": [setup["groups"][0].id],
        }
        missing_biomarker_type_id = (
            BiomarkerType.objects.order_by("-id").values_list("id", flat=True).first()
            + 1000
        )
        missing_group_id = (
            SubjectGroup.objects.order_by("-id").values_list("id", flat=True).first()
            + 1000
        )

        with self.assertRaises(BiomarkerType.DoesNotExist):
            OptimiseContext(
                **base_kwargs,
                biomarker_types=[missing_biomarker_type_id],
            )

        unmapped = BiomarkerType.objects.create(
            name="unmapped",
            dataset=setup["dataset"],
            stored_unit=setup["biomarker_type"].stored_unit,
            display_unit=setup["biomarker_type"].display_unit,
            stored_time_unit=setup["biomarker_type"].stored_time_unit,
            display_time_unit=setup["biomarker_type"].display_time_unit,
        )
        with self.assertRaisesMessage(ValueError, "not mapped"):
            OptimiseContext(**base_kwargs, biomarker_types=[unmapped.id])

        outside_variable = Variable.objects.create(
            name="outside response",
            qname="Outside.response",
            unit=setup["biomarker_type"].stored_unit,
            constant=False,
            state=False,
            pd_model=model.pd_model,
        )
        outside = BiomarkerType.objects.create(
            name="outside",
            dataset=setup["dataset"],
            stored_unit=setup["biomarker_type"].stored_unit,
            display_unit=setup["biomarker_type"].display_unit,
            stored_time_unit=setup["biomarker_type"].stored_time_unit,
            display_time_unit=setup["biomarker_type"].display_time_unit,
            variable=outside_variable,
        )
        with self.assertRaisesMessage(ValueError, "outside this model"):
            OptimiseContext(**base_kwargs, biomarker_types=[outside.id])

        missing_group_kwargs = {
            **base_kwargs,
            "subject_groups": [missing_group_id],
        }
        with self.assertRaises(SubjectGroup.DoesNotExist):
            OptimiseContext(
                **missing_group_kwargs,
                biomarker_types=[setup["biomarker_type"].id],
            )

        setup["biomarker_type"].biomarkers.all().delete()
        with self.assertRaisesMessage(ValueError, "No biomarker data"):
            OptimiseContext(
                model=model,
                optimise_inputs=input_ids,
                starting=[0.2, 1.5],
                bounds=([0.1, 1.0], [0.3, 2.0]),
                biomarker_types=[setup["biomarker_type"].id],
            )

    def test_optimisation_groups_include_ungrouped_and_multiple_outputs(self):
        setup = create_exponential_data(
            name_prefix="optimise_context_groups",
            group_name_prefix="Group",
        )
        model = setup["model"]
        dataset = setup["dataset"]
        amount = model.variables.get(qname="Central.amount")
        subject = setup["groups"][0].subjects.first()
        ungrouped_subject = Subject.objects.create(
            id_in_dataset=99,
            dataset=dataset,
            group=None,
        )
        unit_mg = Unit.objects.get(symbol="mg")
        amount_type = BiomarkerType.objects.create(
            name="amount",
            dataset=dataset,
            stored_unit=unit_mg,
            display_unit=unit_mg,
            stored_time_unit=setup["biomarker_type"].stored_time_unit,
            display_time_unit=setup["biomarker_type"].display_time_unit,
            variable=amount,
        )
        Biomarker.objects.create(
            time=float(SELECTED_TIMES[0]),
            subject=subject,
            biomarker_type=amount_type,
            value=1.0,
        )
        Biomarker.objects.create(
            time=float(SELECTED_TIMES[1]),
            subject=subject,
            biomarker_type=amount_type,
            value=2.0,
        )
        Biomarker.objects.create(
            time=2.0,
            subject=ungrouped_subject,
            biomarker_type=setup["biomarker_type"],
            value=1.0,
        )

        context = OptimiseContext(
            model=model,
            optimise_inputs=[variable.id for variable in setup["inputs"]],
            starting=[0.2, 1.5],
            bounds=([0.1, 1.0], [0.3, 2.0]),
            biomarker_types=[setup["biomarker_type"].id, amount_type.id],
            subject_groups=None,
        )

        ungrouped = next(
            group for group in context.optimisation_groups if group.group_id is None
        )
        grouped = next(
            group
            for group in context.optimisation_groups
            if group.group_id == setup["groups"][0].id
        )
        self.assertIsNone(ungrouped.group_name)
        self.assertEqual([output.qname for output in grouped.outputs], [
            "Central.response",
            "Central.amount",
        ])
        self.assertEqual(grouped.t_eval, tuple(float(t) for t in SELECTED_TIMES))
        amount_records = [
            record for record in grouped.records if record.output_index == 1
        ]
        self.assertEqual([record.time_index for record in amount_records], [0, 1])
        self.assertEqual([record.value for record in amount_records], [1.0, 2.0])

    def test_prediction_loss_and_gradient_failure_branches(self):
        setup = create_exponential_data(
            name_prefix="optimise_context_failures",
            group_name_prefix="Failure",
        )
        context = self._build_optimise_context(
            setup,
            [0.27, 1.45],
            ([0.16, 1.2], [0.3, 2.1]),
        )
        group = context.optimisation_groups[0]
        values_by_id = self._starting_values_by_id(context, setup)
        input_ids = list(values_by_id)
        n_outputs = len(group.outputs)
        n_times = len(group.t_eval)
        finite_y = np.ones((n_outputs, n_times), dtype=float)
        finite_solver = FakeDiffsolOde(
            finite_y,
            sens=self._fake_sens(context, group),
        )
        fake_group = replace(group, diffsol_ode=finite_solver)

        with self.assertRaisesMessage(ValueError, "must be finite"):
            context.optimise_predict(fake_group, {input_ids[0]: np.nan})
        self.assertEqual(
            context.optimise_loss((fake_group,), {input_ids[0]: np.nan}),
            np.inf,
        )

        missing_ode_group = replace(group, diffsol_ode=None)
        with self.assertRaisesMessage(ValueError, "missing a DiffSL ODE"):
            context.optimise_predict(missing_ode_group, values_by_id)
        with mock.patch("pkpdapp.models.optimise_context.logger.exception"):
            self.assertEqual(
                context.optimise_loss((missing_ode_group,), values_by_id),
                np.inf,
            )
            loss, gradient, ssr, n_obs = context.optimise_loss_gradient(
                (missing_ode_group,),
                values_by_id,
            )
        self.assertEqual(loss, np.inf)
        self.assertTrue(np.array_equal(gradient, np.zeros(len(values_by_id))))

        wrong_shape_group = replace(
            group,
            diffsol_ode=FakeDiffsolOde(np.ones((n_outputs + 1, n_times))),
        )
        with self.assertRaisesMessage(ValueError, "Unexpected prediction shape"):
            context.optimise_predict(wrong_shape_group, values_by_id)

        dense_failure_group = replace(
            group,
            diffsol_ode=FakeDiffsolOde(finite_y, raise_dense=True),
        )
        with mock.patch("pkpdapp.models.optimise_context.logger.exception"):
            self.assertEqual(
                context.optimise_loss((dense_failure_group,), values_by_id),
                np.inf,
            )

        sens_failure_group = replace(
            group,
            diffsol_ode=FakeDiffsolOde(
                finite_y,
                sens=self._fake_sens(context, group),
                raise_sens=True,
            ),
        )
        with mock.patch("pkpdapp.models.optimise_context.logger.exception"):
            loss, gradient, ssr, n_obs = context.optimise_loss_gradient(
                (sens_failure_group,),
                values_by_id,
            )
        self.assertEqual(loss, np.inf)
        self.assertTrue(np.array_equal(gradient, np.zeros(len(values_by_id))))

        non_positive_group = replace(
            group,
            diffsol_ode=FakeDiffsolOde(
                np.zeros((n_outputs, n_times), dtype=float),
                sens=self._fake_sens(context, group),
            ),
        )
        self.assertEqual(
            context.optimise_loss(
                (non_positive_group,),
                values_by_id,
                use_multiplicative_noise=True,
            ),
            np.inf,
        )
        loss, gradient, ssr, n_obs = context.optimise_loss_gradient(
            (non_positive_group,),
            values_by_id,
            use_multiplicative_noise=True,
        )
        self.assertEqual(loss, np.inf)
        self.assertTrue(np.array_equal(gradient, np.zeros(len(values_by_id))))

    def test_optimise_diagnostics_serializes_results_and_handles_failure(self):
        setup = create_exponential_data(
            name_prefix="optimise_context_diagnostics",
            group_name_prefix="Diagnostics",
        )
        context = self._build_optimise_context(
            setup,
            [0.27, 1.45],
            ([0.16, 1.2], [0.3, 2.1]),
        )

        diagnostics = context.optimise_diagnostics(np.asarray(setup["true"]))
        self.assertIsNotNone(diagnostics["predictions"])
        self.assertIsNotNone(diagnostics["residuals"])
        self.assertIsNotNone(diagnostics["covariance"])
        self.assertIsNotNone(diagnostics["condition_number"])
        self.assertIsInstance(diagnostics["sigma"], float)

        first_group = context.optimisation_groups[0]
        time_id = context.get_variable_context(context.time_qname).id
        output_id = first_group.outputs[0].id
        self.assertIn(time_id, diagnostics["predictions"][0])
        self.assertIn(output_id, diagnostics["predictions"][0])
        self.assertIn(time_id, diagnostics["residuals"][0])
        self.assertIn(output_id, diagnostics["residuals"][0])

        context.optimisation_groups = (
            replace(
                first_group,
                diffsol_ode=FakeDiffsolOde(
                    np.ones((len(first_group.outputs), len(first_group.t_eval))),
                    sens=self._fake_sens(context, first_group),
                    raise_sens=True,
                ),
            ),
        )
        with mock.patch("pkpdapp.models.optimise_context.logger.exception"):
            failed = context.optimise_diagnostics(np.asarray(setup["true"]))
        self.assertEqual(
            failed,
            {
                "predictions": None,
                "residuals": None,
                "covariance": None,
                "condition_number": None,
                "sigma": 1.0,
            },
        )

    def test_multiplicative_noise_rejects_non_positive_data(self):
        setup = self._exponential_data()
        setup["biomarker_type"].biomarkers.first().delete()
        subject = setup["groups"][0].subjects.first()
        Biomarker.objects.create(
            time=1.0,
            subject=subject,
            biomarker_type=setup["biomarker_type"],
            value=0.0,
        )

        starting = [0.27, 1.45]
        bounds = ([0.16, 1.2], [0.3, 2.1])
        input_ids = [variable.id for variable in setup["inputs"]]
        context = self._build_optimise_context(
            setup,
            starting,
            bounds,
        )
        true_values_by_id = self._to_model_space_values_by_id(
            context,
            input_ids,
            setup["true"],
        )
        loss = context.optimise_loss(
            context.optimisation_groups,
            true_values_by_id,
            use_multiplicative_noise=True,
        )
        self.assertEqual(loss, np.inf)

    def test_optimise_pso(self):
        """Particle Swarm Optimisation method should converge to the true values."""
        setup = self._exponential_data()
        model = setup["model"]
        input_ids = [variable.id for variable in setup["inputs"]]
        starting = [0.27, 1.45]
        bounds = ([0.16, 1.2], [0.3, 2.1])
        group_ids = [group.id for group in setup["groups"]]
        biomarker_type_ids = [setup["biomarker_type"].id]

        context = self._build_optimise_context(
            setup,
            starting,
            bounds,
        )
        starting_values_by_id = self._to_model_space_values_by_id(
            context,
            input_ids,
            starting,
        )
        starting_loss = context.optimise_loss(
            context.optimisation_groups,
            starting_values_by_id,
        )

        result = model.optimise(
            inputs=input_ids,
            starting=starting,
            bounds=bounds,
            biomarker_types=biomarker_type_ids,
            subject_groups=group_ids,
            max_iterations=80,
            method="pso",
        )

        self.assertTrue(np.isfinite(result["loss"]))
        self.assertLess(result["loss"], starting_loss)
        self.assertAlmostEqual(result["optimal"][0], setup["true"][0], delta=0.04)
        self.assertAlmostEqual(result["optimal"][1], setup["true"][1], delta=0.18)

    def test_optimise_gradient_descent(self):
        """Gradient descent uses forward sensitivities and should reduce the loss."""
        setup = self._exponential_data()
        model = setup["model"]
        input_ids = [variable.id for variable in setup["inputs"]]
        starting = [0.27, 1.45]
        bounds = ([0.16, 1.2], [0.3, 2.1])
        group_ids = [group.id for group in setup["groups"]]
        biomarker_type_ids = [setup["biomarker_type"].id]

        context = self._build_optimise_context(
            setup,
            starting,
            bounds,
        )
        prepared_groups = context.optimisation_groups
        starting_values_by_id = self._to_model_space_values_by_id(
            context,
            input_ids,
            starting,
        )
        starting_loss = context.optimise_loss(
            prepared_groups,
            starting_values_by_id,
        )

        # Verify that sensitivity helper returns correctly shaped arrays.
        y, y_prime = context.optimise_predict_with_sens(
            prepared_groups[0],
            starting_values_by_id,
        )
        n_times = len(prepared_groups[0].t_eval)
        n_outputs = len(prepared_groups[0].outputs)
        n_params = len(input_ids)
        self.assertEqual(y.shape, (n_times, n_outputs))
        self.assertEqual(y_prime.shape, (n_times, n_outputs, n_params))
        self.assertTrue(np.all(np.isfinite(y)))
        self.assertTrue(np.all(np.isfinite(y_prime)))

        # Verify that optimise_loss_gradient returns (nll, ode_gradient, ssr, n_obs).
        total_loss, total_gradient, ssr, n_obs = context.optimise_loss_gradient(
            prepared_groups,
            starting_values_by_id,
        )
        self.assertTrue(np.isfinite(total_loss))
        self.assertEqual(total_gradient.shape, (n_params,))
        self.assertTrue(np.all(np.isfinite(total_gradient)))

        result = model.optimise(
            inputs=input_ids,
            starting=starting,
            bounds=bounds,
            biomarker_types=biomarker_type_ids,
            subject_groups=group_ids,
            max_iterations=200,
            method="gradient_descent",
        )

        self.assertTrue(np.isfinite(result["loss"]))
        self.assertLess(result["loss"], starting_loss)
