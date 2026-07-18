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
from pkpdapp.models.optimise_context import (
    ObservationInfo,
    OptimiseContext,
    ParameterInfo,
)
from pkpdapp.models import (
    Biomarker,
    BiomarkerType,
    Subject,
    SubjectGroup,
    Unit,
    Variable,
)
from pkpdapp.tests.optimise_fixtures import (
    DOSE_SPECS,
    SELECTED_TIMES,
    TRUE_K,
    create_exponential_data,
    exponential_response,
)


def make_parameters(input_ids, starting, bounds, use_log_space=None):
    """Build the ParameterInfo list ``optimise`` expects from parallel lists.

    ``use_log_space``, if given, is a list of bools parallel to ``input_ids``.
    """
    lower, upper = bounds
    if use_log_space is None:
        use_log_space = [False] * len(input_ids)
    return [
        ParameterInfo(
            variable_id=variable_id,
            starting=start,
            lower_bound=low,
            upper_bound=up,
            use_log_space=log_space,
        )
        for variable_id, start, low, up, log_space in zip(
            input_ids, starting, lower, upper, use_log_space
        )
    ]


def _make_sigma(*, use_log_space=True, start=1.0, upper=10.0):
    return ParameterInfo(
        starting=start,
        lower_bound=0.0,
        upper_bound=upper,
        use_log_space=use_log_space,
    )


def make_observation(
    biomarker_type_id,
    noise_model="additive",
    *,
    use_log_space=True,
    start=1.0,
    upper=10.0,
):
    """Build one ObservationInfo carrying its noise model and sigma param(s):
    one sigma for additive / multiplicative, and a second (sigma_mult) for the
    combined model. Bounds default to [0, upper] in linear sigma units.
    """
    sigma_mult = (
        _make_sigma(use_log_space=use_log_space, start=start, upper=upper)
        if noise_model == "combined"
        else None
    )
    return ObservationInfo(
        biomarker_type=biomarker_type_id,
        noise_model=noise_model,
        sigma=_make_sigma(use_log_space=use_log_space, start=start, upper=upper),
        sigma_mult=sigma_mult,
    )


def make_observations(biomarker_type_ids, noise_model="additive", **kwargs):
    """Build the ``observations`` list ``optimise`` expects: one ObservationInfo
    per biomarker type, all using ``noise_model``.
    """
    return [
        make_observation(biomarker_type_id, noise_model, **kwargs)
        for biomarker_type_id in biomarker_type_ids
    ]


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
    def setUp(self):
        # The gradient-free optimisers (PSO, CMA-ES) draw from the global numpy
        # RNG, which makes their convergence tests flaky. Seed it so every test in
        # this class is deterministic.
        np.random.seed(1234)

    def _build_optimise_context(self, setup, starting, bounds, noise_model="additive"):
        return OptimiseContext(
            model=setup["model"],
            optimise_inputs=[variable.id for variable in setup["inputs"]],
            starting=starting,
            bounds=bounds,
            observations=make_observations([setup["biomarker_type"].id], noise_model),
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
            parameters=make_parameters(input_ids, starting, bounds),
            observations=make_observations(biomarker_type_ids),
            subject_groups=group_ids,
            max_iterations=80,
        )

        self.assertTrue(np.isfinite(result.loss))
        self.assertLess(result.loss, starting_loss)
        self.assertAlmostEqual(result.optimal[0], true_values[0], delta=0.04)
        self.assertAlmostEqual(result.optimal[1], true_values[1], delta=0.18)

    def test_excluded_biomarkers_are_dropped_from_fitting(self):
        """Biomarkers with exclude=True are not loaded into the fit, so the
        optimisation groups carry one fewer record per excluded point."""
        setup = self._exponential_data()
        biomarker_type = setup["biomarker_type"]

        context = self._build_optimise_context(
            setup, [0.27, 1.45], ([0.16, 1.2], [0.3, 2.1])
        )
        n_before = sum(len(g.records) for g in context.optimisation_groups)
        self.assertGreater(n_before, 0)

        # Exclude a single datapoint belonging to a fitted subject group.
        group_subject_ids = [
            subject.id
            for group in setup["groups"]
            for subject in group.subjects.all()
        ]
        excluded = biomarker_type.biomarkers.filter(
            subject_id__in=group_subject_ids
        ).first()
        self.assertIsNotNone(excluded)
        excluded.exclude = True
        excluded.save()

        context_after = self._build_optimise_context(
            setup, [0.27, 1.45], ([0.16, 1.2], [0.3, 2.1])
        )
        n_after = sum(len(g.records) for g in context_after.optimisation_groups)
        self.assertEqual(n_after, n_before - 1)

    def test_optimise_validation(self):
        setup = self._exponential_data()
        model = setup["model"]
        input_ids = [variable.id for variable in setup["inputs"]]

        result = model.optimise(
            parameters=make_parameters(input_ids[:1], [0.2], ([0.1], [0.3])),
            observations=make_observations([setup["biomarker_type"].id]),
            subject_groups=[setup["groups"][0].id],
            max_iterations=25,
        )
        self.assertEqual(len(result.optimal), 1)
        self.assertTrue(np.isfinite(result.loss))

        with self.assertRaises(ValueError):
            model.optimise(
                parameters=make_parameters(
                    input_ids, [0.2, 1.5], ([0.3, 1.0], [0.1, 2.0])
                ),
                observations=make_observations([setup["biomarker_type"].id]),
                subject_groups=[setup["groups"][0].id],
                max_iterations=1,
            )

    def test_optimise_requires_observations(self):
        setup = self._exponential_data()
        model = setup["model"]
        input_ids = [variable.id for variable in setup["inputs"]]
        with self.assertRaisesMessage(ValueError, "at least one observation"):
            model.optimise(
                parameters=make_parameters(input_ids[:1], [0.2], ([0.1], [0.3])),
                observations=[],
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
                observations=make_observations([setup["biomarker_type"].id]),
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
                observations=make_observations([missing_biomarker_type_id]),
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
            OptimiseContext(
                **base_kwargs, observations=make_observations([unmapped.id])
            )

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
            OptimiseContext(
                **base_kwargs, observations=make_observations([outside.id])
            )

        missing_group_kwargs = {
            **base_kwargs,
            "subject_groups": [missing_group_id],
        }
        with self.assertRaises(SubjectGroup.DoesNotExist):
            OptimiseContext(
                **missing_group_kwargs,
                observations=make_observations([setup["biomarker_type"].id]),
            )

        setup["biomarker_type"].biomarkers.all().delete()
        with self.assertRaisesMessage(ValueError, "No biomarker data"):
            OptimiseContext(
                model=model,
                optimise_inputs=input_ids,
                starting=[0.2, 1.5],
                bounds=([0.1, 1.0], [0.3, 2.0]),
                observations=make_observations([setup["biomarker_type"].id]),
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
            observations=make_observations(
                [setup["biomarker_type"].id, amount_type.id]
            ),
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

        # There should be one canonical sigma per distinct output variable, in
        # ascending variable-id order and shared across groups.
        response_id = setup["biomarker_type"].variable.id
        amount_id = amount.id
        self.assertEqual(
            context.sigma_output_variable_ids,
            tuple(sorted((response_id, amount_id))),
        )
        self.assertEqual(len(context.sigma_output_qnames), 2)
        self.assertIn("Central.response", context.sigma_output_qnames)
        self.assertIn("Central.amount", context.sigma_output_qnames)
        # The amount records resolve to the amount variable's canonical index.
        expected_amount_index = context.sigma_output_variable_ids.index(amount_id)
        for record in amount_records:
            self.assertEqual(
                context._sigma_index_for_record(grouped, record),
                expected_amount_index,
            )

    def test_optimise_fits_one_sigma_per_output_variable(self):
        setup = create_exponential_data(
            name_prefix="optimise_multi_sigma",
            group_name_prefix="MultiSigma",
        )
        model = setup["model"]
        dataset = setup["dataset"]
        amount = model.variables.get(qname="Central.amount")
        response_id = setup["biomarker_type"].variable.id
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
        # Add amount observations (response / scale) for each subject.
        for group, doses in zip(setup["groups"], DOSE_SPECS):
            subject = group.subjects.first()
            amounts = exponential_response(SELECTED_TIMES, doses, TRUE_K, 1.0)
            for t, value in zip(SELECTED_TIMES, amounts):
                Biomarker.objects.create(
                    time=float(t),
                    subject=subject,
                    biomarker_type=amount_type,
                    value=float(max(value, 1e-6)),
                )

        result = model.optimise(
            parameters=make_parameters(
                [variable.id for variable in setup["inputs"]],
                [0.27, 1.45],
                ([0.16, 1.2], [0.3, 2.1]),
            ),
            observations=make_observations(
                [setup["biomarker_type"].id, amount_type.id]
            ),
            subject_groups=[group.id for group in setup["groups"]],
            max_iterations=60,
        )

        expected_ids = sorted((response_id, amount.id))
        self.assertEqual(result.sigma_variables, expected_ids)
        self.assertEqual(len(result.sigma), 2)
        self.assertEqual(len(result.sigma_start), 2)
        self.assertEqual(len(result.sigma_use_log_space), 2)
        self.assertEqual(len(result.sigma_bounds), 2)
        self.assertTrue(np.all(np.isfinite(result.sigma)))
        self.assertTrue(all(s > 0 for s in result.sigma))
        # The two output variables have very different scales, so their fitted
        # noise sigmas should differ.
        self.assertNotAlmostEqual(result.sigma[0], result.sigma[1])

    def _two_output_setup(self, name_prefix):
        """Exponential data with a second (``Central.amount``) output variable, so
        different biomarker types can be given different noise models."""
        setup = create_exponential_data(
            name_prefix=name_prefix, group_name_prefix="Mixed"
        )
        model = setup["model"]
        amount = model.variables.get(qname="Central.amount")
        unit_mg = Unit.objects.get(symbol="mg")
        amount_type = BiomarkerType.objects.create(
            name="amount",
            dataset=setup["dataset"],
            stored_unit=unit_mg,
            display_unit=unit_mg,
            stored_time_unit=setup["biomarker_type"].stored_time_unit,
            display_time_unit=setup["biomarker_type"].display_time_unit,
            variable=amount,
        )
        for group, doses in zip(setup["groups"], DOSE_SPECS):
            subject = group.subjects.first()
            amounts = exponential_response(SELECTED_TIMES, doses, TRUE_K, 1.0)
            for t, value in zip(SELECTED_TIMES, amounts):
                Biomarker.objects.create(
                    time=float(t),
                    subject=subject,
                    biomarker_type=amount_type,
                    value=float(max(value, 1e-6)),
                )
        setup["amount"] = amount
        setup["amount_type"] = amount_type
        return setup

    def test_optimise_mixed_noise_models_pack_and_gradient(self):
        """Different biomarker types can use different noise models in one fit:
        the packed sigma block has one sigma_a per output plus one sigma_m per
        combined output, and the analytic gradient matches finite differences."""
        setup = self._two_output_setup("optimise_mixed_grad")
        response_type = setup["biomarker_type"]
        amount_type = setup["amount_type"]
        input_ids = [variable.id for variable in setup["inputs"]]
        starting = [0.27, 1.45]
        bounds = ([0.16, 1.2], [0.3, 2.1])

        # response -> additive, amount -> combined.
        observations = [
            make_observation(response_type.id, "additive"),
            make_observation(amount_type.id, "combined"),
        ]
        context = OptimiseContext(
            model=setup["model"],
            optimise_inputs=input_ids,
            starting=starting,
            bounds=bounds,
            observations=observations,
            subject_groups=[group.id for group in setup["groups"]],
            use_diffsol=True,
        )

        n_outputs = len(context.sigma_output_variable_ids)
        self.assertEqual(n_outputs, 2)
        self.assertEqual(set(context.noise_model_by_output), {"additive", "combined"})
        self.assertEqual(len(context.combined_output_indices), 1)
        combined_k = context.combined_output_indices[0]

        values_by_id = self._to_model_space_values_by_id(
            context, input_ids, starting
        )
        sigma = np.full(n_outputs, np.exp(-0.5))
        # sigma_m only matters for the combined output; other entries are inert.
        sigma_mult = np.ones(n_outputs)
        sigma_mult[combined_k] = np.exp(-1.0)

        nll, ode_gradient, sigma_gradient = context.optimise_loss_gradient(
            context.optimisation_groups,
            values_by_id,
            sigma=sigma,
            sigma_mult=sigma_mult,
        )
        self.assertTrue(np.isfinite(nll))
        # One sigma_a per output (2) plus one sigma_m for the single combined
        # output (1).
        self.assertEqual(len(sigma_gradient), n_outputs + 1)

        def loss_at(s, sm):
            return context.optimise_loss(
                context.optimisation_groups, values_by_id, sigma=s, sigma_mult=sm
            )

        eps = 1e-6
        # sigma_a gradient for each output (additive and combined).
        for k in range(n_outputs):
            sp = sigma.copy()
            sp[k] += eps
            sm = sigma.copy()
            sm[k] -= eps
            fd = (loss_at(sp, sigma_mult) - loss_at(sm, sigma_mult)) / (2.0 * eps)
            np.testing.assert_allclose(
                fd, sigma_gradient[k], rtol=1e-2, atol=1e-3
            )

        # The single sigma_m gradient (last packed entry) for the combined output.
        mp = sigma_mult.copy()
        mp[combined_k] += eps
        mm = sigma_mult.copy()
        mm[combined_k] -= eps
        fd = (loss_at(sigma, mp) - loss_at(sigma, mm)) / (2.0 * eps)
        np.testing.assert_allclose(
            fd, sigma_gradient[n_outputs], rtol=1e-2, atol=1e-3
        )

    def test_optimise_mixed_noise_models_result(self):
        """End-to-end mixed fit: sigma_mult is reported per output, None for the
        additive output and a float for the combined one."""
        setup = self._two_output_setup("optimise_mixed_result")
        response_type = setup["biomarker_type"]
        amount_type = setup["amount_type"]
        input_ids = [variable.id for variable in setup["inputs"]]

        result = setup["model"].optimise(
            parameters=make_parameters(
                input_ids, [0.27, 1.45], ([0.16, 1.2], [0.3, 2.1])
            ),
            observations=[
                make_observation(response_type.id, "additive"),
                make_observation(amount_type.id, "combined"),
            ],
            subject_groups=[group.id for group in setup["groups"]],
            max_iterations=40,
        )

        self.assertTrue(np.isfinite(result.loss))
        self.assertEqual(len(result.sigma), 2)
        self.assertEqual(len(result.sigma_mult), 2)
        # sigma_mult is None for the additive output and a float for the combined.
        combined_index = result.sigma_variables.index(setup["amount"].id)
        additive_index = result.sigma_variables.index(response_type.variable.id)
        self.assertIsNone(result.sigma_mult[additive_index])
        self.assertIsInstance(result.sigma_mult[combined_index], float)
        self.assertIsNone(result.sigma_mult_start[additive_index])
        self.assertIsInstance(result.sigma_mult_start[combined_index], float)

    def test_optimise_rejects_duplicate_output_variable(self):
        """Two biomarker types mapping to the same output variable are ambiguous
        (which noise model / sigma?) and are rejected."""
        setup = self._exponential_data()
        duplicate_type = BiomarkerType.objects.create(
            name="duplicate response",
            dataset=setup["dataset"],
            stored_unit=setup["biomarker_type"].stored_unit,
            display_unit=setup["biomarker_type"].display_unit,
            stored_time_unit=setup["biomarker_type"].stored_time_unit,
            display_time_unit=setup["biomarker_type"].display_time_unit,
            variable=setup["biomarker_type"].variable,
        )
        input_ids = [variable.id for variable in setup["inputs"]]
        with self.assertRaisesMessage(ValueError, "same output variable"):
            OptimiseContext(
                model=setup["model"],
                optimise_inputs=input_ids,
                starting=[0.27, 1.45],
                bounds=([0.16, 1.2], [0.3, 2.1]),
                observations=make_observations(
                    [setup["biomarker_type"].id, duplicate_type.id]
                ),
                subject_groups=[group.id for group in setup["groups"]],
            )

    def test_observation_noise_model_validation(self):
        setup = self._exponential_data()
        bt_id = setup["biomarker_type"].id
        input_ids = [variable.id for variable in setup["inputs"]]

        def build(observations):
            return OptimiseContext(
                model=setup["model"],
                optimise_inputs=input_ids,
                starting=[0.27, 1.45],
                bounds=([0.16, 1.2], [0.3, 2.1]),
                observations=observations,
                subject_groups=[group.id for group in setup["groups"]],
            )

        # combined requires sigma_mult.
        with self.assertRaisesMessage(ValueError, "requires sigma_mult"):
            build([
                ObservationInfo(
                    biomarker_type=bt_id,
                    noise_model="combined",
                    sigma=_make_sigma(),
                    sigma_mult=None,
                )
            ])

        # sigma_mult is only valid for the combined model.
        with self.assertRaisesMessage(ValueError, "only valid for the 'combined'"):
            build([
                ObservationInfo(
                    biomarker_type=bt_id,
                    noise_model="additive",
                    sigma=_make_sigma(),
                    sigma_mult=_make_sigma(),
                )
            ])

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
            loss, gradient, sigma_gradient = context.optimise_loss_gradient(
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
            loss, gradient, sigma_gradient = context.optimise_loss_gradient(
                (sens_failure_group,),
                values_by_id,
            )
        self.assertEqual(loss, np.inf)
        self.assertTrue(np.array_equal(gradient, np.zeros(len(values_by_id))))

        # Under the multiplicative model, non-positive observed values are
        # filtered out rather than aborting the fit. When every observation is
        # filtered the loss and gradient contributions are simply zero. The noise
        # model is a property of the context (per output), so use a multiplicative
        # context here.
        mult_context = self._build_optimise_context(
            setup,
            [0.27, 1.45],
            ([0.16, 1.2], [0.3, 2.1]),
            noise_model="multiplicative",
        )
        non_positive_obs_group = replace(
            group,
            diffsol_ode=FakeDiffsolOde(
                finite_y,
                sens=self._fake_sens(context, group),
            ),
            records=tuple(
                replace(record, value=0.0) for record in group.records
            ),
        )
        self.assertEqual(
            mult_context.optimise_loss(
                (non_positive_obs_group,),
                values_by_id,
            ),
            0.0,
        )
        loss, gradient, sigma_gradient = mult_context.optimise_loss_gradient(
            (non_positive_obs_group,),
            values_by_id,
        )
        self.assertEqual(loss, 0.0)
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
        self.assertIsInstance(diagnostics["sigma"], list)
        self.assertTrue(all(isinstance(s, float) for s in diagnostics["sigma"]))
        self.assertEqual(
            diagnostics["sigma_variables"],
            list(context.sigma_output_variable_ids),
        )
        self.assertEqual(
            len(diagnostics["sigma"]), len(context.sigma_output_variable_ids)
        )

        first_group = context.optimisation_groups[0]
        time_id = context.get_variable_context(context.time_qname).id
        output_id = first_group.outputs[0].id
        self.assertIn(time_id, diagnostics["predictions"][0])
        self.assertIn(output_id, diagnostics["predictions"][0])
        self.assertIn(time_id, diagnostics["residuals"][0])
        self.assertIn(output_id, diagnostics["residuals"][0])
        self.assertIsNotNone(diagnostics["observations"])
        self.assertIn(time_id, diagnostics["observations"][0])
        self.assertIn(output_id, diagnostics["observations"][0])
        # Observations mirror residuals: one entry per group, aligned per output.
        self.assertEqual(
            len(diagnostics["observations"]), len(diagnostics["residuals"])
        )
        self.assertEqual(
            len(diagnostics["observations"][0][output_id]),
            len(diagnostics["residuals"][0][output_id]),
        )

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
        n_sigma = len(context.sigma_output_variable_ids)
        self.assertEqual(
            failed,
            {
                "predictions": None,
                "residuals": None,
                "observations": None,
                "covariance": None,
                "condition_number": None,
                "sigma": [1.0] * n_sigma,
                "sigma_mult": None,
                "sigma_variables": list(context.sigma_output_variable_ids),
                "filtered_observations": 0,
                "neg2ll": None,
                "aic": None,
                "bic": None,
            },
        )

    def test_optimise_diagnostics_information_criteria(self):
        """neg2ll / AIC / BIC are the absolute deviance and standard criteria."""
        setup = create_exponential_data(
            name_prefix="optimise_context_info_criteria",
            group_name_prefix="InfoCriteria",
        )
        input_ids = [variable.id for variable in setup["inputs"]]
        optimal = np.asarray(setup["true"])

        for noise_model in ("additive", "multiplicative", "combined"):
            # The noise model is baked into the context (per output), so build a
            # fresh context for each model.
            context = self._build_optimise_context(
                setup,
                [0.27, 1.45],
                ([0.16, 1.2], [0.3, 2.1]),
                noise_model=noise_model,
            )
            values_by_id = self._to_model_space_values_by_id(
                context, input_ids, setup["true"]
            )
            n_obs = sum(len(g.records) for g in context.optimisation_groups)
            self.assertGreater(n_obs, 0)

            diagnostics = context.optimise_diagnostics(optimal)
            nll = context.optimise_loss(
                context.optimisation_groups,
                values_by_id,
            )

            n_sigma = len(context.sigma_output_variable_ids) * (
                2 if noise_model == "combined" else 1
            )
            k = len(input_ids) + n_sigma

            expected_neg2ll = 2.0 * nll + n_obs * np.log(2.0 * np.pi)
            if noise_model == "multiplicative":
                sum_log_obs = sum(
                    float(np.log(record.value))
                    for group in context.optimisation_groups
                    for record in group.records
                )
                expected_neg2ll += 2.0 * sum_log_obs

            expected_aic = 2.0 * k + expected_neg2ll
            expected_bic = k * np.log(n_obs) + expected_neg2ll

            self.assertAlmostEqual(
                diagnostics["neg2ll"], expected_neg2ll, places=6, msg=noise_model
            )
            self.assertAlmostEqual(
                diagnostics["aic"], expected_aic, places=6, msg=noise_model
            )
            self.assertAlmostEqual(
                diagnostics["bic"], expected_bic, places=6, msg=noise_model
            )
            # AIC and BIC differ only by the parameter penalty term.
            self.assertAlmostEqual(
                diagnostics["bic"] - diagnostics["aic"],
                k * (np.log(n_obs) - 2.0),
                places=6,
                msg=noise_model,
            )

    def test_multiplicative_noise_filters_non_positive_data(self):
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
            noise_model="multiplicative",
        )
        true_values_by_id = self._to_model_space_values_by_id(
            context,
            input_ids,
            setup["true"],
        )
        # The single non-positive observation is filtered out rather than
        # aborting the fit, so the loss is finite.
        loss = context.optimise_loss(
            context.optimisation_groups,
            true_values_by_id,
        )
        self.assertTrue(np.isfinite(loss))

        # The diagnostics report exactly one filtered observation.
        diagnostics = context.optimise_diagnostics(
            np.asarray(setup["true"]),
        )
        self.assertEqual(diagnostics["filtered_observations"], 1)

    def test_only_multiplicative_noise_filters_near_zero_data(self):
        setup = self._exponential_data()
        # Set two observations at or below the observed-value floor.
        near_zero = list(setup["biomarker_type"].biomarkers.all()[:2])
        for biomarker in near_zero:
            biomarker.value = 0.0
            biomarker.save()

        optimal = np.asarray(setup["true"])

        def diagnostics_for(noise_model):
            context = self._build_optimise_context(
                setup,
                [0.27, 1.45],
                ([0.16, 1.2], [0.3, 2.1]),
                noise_model=noise_model,
            )
            return context.optimise_diagnostics(optimal)

        # Multiplicative drops the two near-zero observations.
        self.assertEqual(
            diagnostics_for("multiplicative")["filtered_observations"], 2
        )

        # Additive and combined models take no logarithm of the observation, so
        # near-zero values are valid and nothing is filtered.
        self.assertEqual(diagnostics_for("additive")["filtered_observations"], 0)
        self.assertEqual(diagnostics_for("combined")["filtered_observations"], 0)

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
            parameters=make_parameters(input_ids, starting, bounds),
            observations=make_observations(biomarker_type_ids),
            subject_groups=group_ids,
            max_iterations=80,
            method="pso",
        )

        self.assertTrue(np.isfinite(result.loss))
        self.assertLess(result.loss, starting_loss)
        self.assertAlmostEqual(result.optimal[0], setup["true"][0], delta=0.04)
        self.assertAlmostEqual(result.optimal[1], setup["true"][1], delta=0.18)

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

        # Verify that optimise_loss_gradient returns (nll, ode_gradient,
        # sigma_gradient).
        total_loss, total_gradient, sigma_gradient = context.optimise_loss_gradient(
            prepared_groups,
            starting_values_by_id,
        )
        self.assertTrue(np.isfinite(total_loss))
        self.assertEqual(total_gradient.shape, (n_params,))
        self.assertTrue(np.all(np.isfinite(total_gradient)))

        result = model.optimise(
            parameters=make_parameters(input_ids, starting, bounds),
            observations=make_observations(biomarker_type_ids),
            subject_groups=group_ids,
            max_iterations=200,
            method="gradient_descent",
        )

        self.assertTrue(np.isfinite(result.loss))
        self.assertLess(result.loss, starting_loss)

    def test_optimise_adam_converges(self):
        """Adam converges to the true values with the frontend's default config:
        model parameters and sigma optimised in log space with a zero lower bound
        (the configuration that previously stayed stuck at the initial values,
        before the pints-transformation fix). Asserts the parameters actually move
        to the optimum, not just that the loss decreases."""
        setup = self._exponential_data()
        model = setup["model"]
        input_ids = [variable.id for variable in setup["inputs"]]
        true_values = setup["true"]

        result = model.optimise(
            parameters=make_parameters(
                input_ids,
                [0.27, 1.45],
                ([0.0, 0.0], [1.0, 10.0]),
                use_log_space=[True, True],
            ),
            observations=make_observations([setup["biomarker_type"].id]),
            subject_groups=[group.id for group in setup["groups"]],
            max_iterations=500,
            method="adam",
        )

        self.assertTrue(np.isfinite(result.loss))
        self.assertAlmostEqual(result.optimal[0], true_values[0], delta=0.04)
        self.assertAlmostEqual(result.optimal[1], true_values[1], delta=0.18)

    def test_combined_noise_gradient_matches_finite_difference(self):
        """The combined-noise analytic gradient matches finite differences for
        both the ODE parameters and the two (linear) sigma parameters."""
        setup = self._exponential_data()
        input_ids = [variable.id for variable in setup["inputs"]]
        starting = [0.27, 1.45]
        bounds = ([0.16, 1.2], [0.3, 2.1])
        context = self._build_optimise_context(
            setup, starting, bounds, noise_model="combined"
        )
        values_by_id = self._to_model_space_values_by_id(
            context, input_ids, starting
        )
        keys = list(values_by_id)
        base_vals = np.array([values_by_id[k] for k in keys], dtype=float)
        n_outputs = len(context.sigma_output_variable_ids)
        sigma = np.full(n_outputs, np.exp(-0.5))
        sigma_mult = np.full(n_outputs, np.exp(-1.0))

        nll, ode_gradient, sigma_gradient = context.optimise_loss_gradient(
            context.optimisation_groups,
            values_by_id,
            sigma=sigma,
            sigma_mult=sigma_mult,
        )
        self.assertTrue(np.isfinite(nll))
        self.assertEqual(len(sigma_gradient), 2 * n_outputs)

        def loss_at(vals, s, sm):
            return context.optimise_loss(
                context.optimisation_groups,
                {k: float(v) for k, v in zip(keys, vals)},
                sigma=s,
                sigma_mult=sm,
            )

        eps = 1e-6
        # ODE-parameter gradient (also exercises the forward sensitivities).
        for i in range(len(base_vals)):
            vp = base_vals.copy()
            vp[i] += eps
            vm = base_vals.copy()
            vm[i] -= eps
            fd = (
                loss_at(vp, sigma, sigma_mult) - loss_at(vm, sigma, sigma_mult)
            ) / (2.0 * eps)
            np.testing.assert_allclose(fd, ode_gradient[i], rtol=1e-2, atol=1e-3)

        # The sigma gradients depend on the prediction y_hat (through the
        # combined variance), and optimise_loss (solve_dense) vs
        # optimise_loss_gradient (solve_fwd_sens) produce slightly different
        # y_hat, so the finite-difference match is bounded by solver tolerance
        # rather than machine precision. See the exact fake-solver check in
        # test_combined_noise_sigma_gradient_exact for a tight formula check.
        for i in range(n_outputs):
            sp = sigma.copy()
            sp[i] += eps
            sm = sigma.copy()
            sm[i] -= eps
            fd = (
                loss_at(base_vals, sp, sigma_mult)
                - loss_at(base_vals, sm, sigma_mult)
            ) / (2.0 * eps)
            np.testing.assert_allclose(fd, sigma_gradient[i], rtol=1e-2, atol=1e-3)

        # proportional (sigma_m) gradient.
        for i in range(n_outputs):
            mp = sigma_mult.copy()
            mp[i] += eps
            mm = sigma_mult.copy()
            mm[i] -= eps
            fd = (
                loss_at(base_vals, sigma, mp) - loss_at(base_vals, sigma, mm)
            ) / (2.0 * eps)
            np.testing.assert_allclose(
                fd, sigma_gradient[n_outputs + i], rtol=1e-2, atol=1e-3
            )

    def test_combined_noise_sigma_gradient_exact(self):
        """Exact check of the combined-noise sigma gradients using a fake solver
        whose predictions are identical for the loss and gradient paths, so the
        finite differences match the analytic formulas to near machine
        precision."""
        setup = self._exponential_data()
        context = self._build_optimise_context(
            setup, [0.27, 1.45], ([0.16, 1.2], [0.3, 2.1]), noise_model="combined"
        )
        group = context.optimisation_groups[0]
        values_by_id = self._starting_values_by_id(context, setup)
        n_outputs = len(group.outputs)
        n_times = len(group.t_eval)
        # Distinct, positive predictions so y_hat^2 matters in the variance.
        finite_y = np.linspace(0.5, 2.0, n_outputs * n_times).reshape(
            n_outputs, n_times
        )
        fake_group = replace(
            group,
            diffsol_ode=FakeDiffsolOde(
                finite_y, sens=self._fake_sens(context, group)
            ),
        )
        groups = (fake_group,)
        sigma = np.full(n_outputs, np.exp(-0.3))
        sigma_mult = np.full(n_outputs, np.exp(-0.8))

        _, _, sigma_gradient = context.optimise_loss_gradient(
            groups,
            values_by_id,
            sigma=sigma,
            sigma_mult=sigma_mult,
        )

        eps = 1e-6
        for i in range(n_outputs):
            sp = sigma.copy()
            sp[i] += eps
            sm = sigma.copy()
            sm[i] -= eps
            fd = (
                context.optimise_loss(groups, values_by_id, sp, sigma_mult)
                - context.optimise_loss(groups, values_by_id, sm, sigma_mult)
            ) / (2.0 * eps)
            np.testing.assert_allclose(fd, sigma_gradient[i], rtol=1e-6, atol=1e-8)

            mp = sigma_mult.copy()
            mp[i] += eps
            mm = sigma_mult.copy()
            mm[i] -= eps
            fd = (
                context.optimise_loss(groups, values_by_id, sigma, mp)
                - context.optimise_loss(groups, values_by_id, sigma, mm)
            ) / (2.0 * eps)
            np.testing.assert_allclose(
                fd, sigma_gradient[n_outputs + i], rtol=1e-6, atol=1e-8
            )

    def _combined_conversion_factors(self, context):
        return np.array(
            [
                context.get_variable_context(
                    context.get_input_name(input_id)
                ).conversion_factor
                for input_id in context.optimise_input_ids
            ],
            dtype=float,
        )

    def test_combined_noise_diagnostics_covariance_exact(self):
        """The combined-noise diagnostics covariance equals an independently
        computed GLS covariance (J^T W J)^-1 with W = diag(1/s_i^2), scaled by
        the parameter conversion factors."""
        setup = self._exponential_data()
        context = self._build_optimise_context(
            setup, [0.27, 1.45], ([0.16, 1.2], [0.3, 2.1]), noise_model="combined"
        )
        input_ids = list(context.optimise_input_ids)
        cf = self._combined_conversion_factors(context)
        optimal_model = np.array(setup["true"], dtype=float) * cf
        values_by_id = {i: float(v) for i, v in zip(input_ids, optimal_model)}
        n_outputs = len(context.sigma_output_variable_ids)
        sigma = np.full(n_outputs, 0.4)
        sigma_mult = np.full(n_outputs, 0.1)

        diag = context.optimise_diagnostics(
            optimal_model,
            sigma=sigma,
            sigma_mult=sigma_mult,
        )
        self.assertIsNotNone(diag["covariance"])
        cov = np.array(diag["covariance"], dtype=float)

        # Independently rebuild (J^T W J)^-1 from the model's own sensitivities.
        sigma_a2 = sigma**2
        sigma_m2 = sigma_mult**2
        jac_rows = []
        weights = []
        for group in context.optimisation_groups:
            y, y_prime = context.optimise_predict_with_sens(group, values_by_id)
            for record in group.records:
                k = context._sigma_index_for_record(group, record)
                pred = y[record.time_index, record.output_index]
                s2 = sigma_a2[k] + sigma_m2[k] * pred * pred
                jac_rows.append(y_prime[record.time_index, record.output_index, :])
                weights.append(1.0 / s2)
        J = np.array(jac_rows)
        W = np.array(weights)
        cov_model = np.linalg.pinv(J.T @ (W[:, None] * J))
        inv_cf = np.diag(1.0 / cf)
        expected = inv_cf @ cov_model @ inv_cf

        np.testing.assert_allclose(cov, expected, rtol=1e-9, atol=1e-12)

    def test_combined_noise_diagnostics_covariance_matches_monte_carlo(self):
        """Simulation-based check: generate many datasets from the combined
        noise model at the true parameters, refit each, and confirm the
        empirical parameter correlation and relative standard errors match the
        covariance the diagnostics report. This validates that W = diag(1/s_i^2)
        is the correct weighting for this noise model end-to-end."""
        from scipy.optimize import minimize

        setup = self._exponential_data()
        context = self._build_optimise_context(
            setup, [0.27, 1.45], ([0.16, 1.2], [0.3, 2.1]), noise_model="combined"
        )
        input_ids = list(context.optimise_input_ids)
        true_user = np.array(setup["true"], dtype=float)
        cf = self._combined_conversion_factors(context)
        true_model = true_user * cf
        true_values_by_id = {i: float(v) for i, v in zip(input_ids, true_model)}

        n_outputs = len(context.sigma_output_variable_ids)
        sigma_a = 0.4
        sigma_m = 0.1
        sigma = np.full(n_outputs, sigma_a)
        sigma_mult = np.full(n_outputs, sigma_m)

        # Diagnostics covariance at the true parameters. The covariance depends
        # only on the parameters and sigma (through predictions), not on the
        # observed values, so this is the asymptotic sampling covariance the
        # refits below should reproduce.
        diag = context.optimise_diagnostics(
            true_model,
            sigma=sigma,
            sigma_mult=sigma_mult,
        )
        cov_diag = np.array(diag["covariance"], dtype=float)
        d = np.sqrt(np.diag(cov_diag))
        corr_diag = cov_diag / np.outer(d, d)
        # Relative SE is invariant to the diagonal conversion-factor scaling, so
        # it can be compared directly against the model-space empirical estimate.
        rel_se_diag = d / np.abs(true_user)

        # Predictions at the true parameters, used to generate synthetic data.
        preds = [
            context.optimise_predict(group, true_values_by_id)
            for group in context.optimisation_groups
        ]

        rng = np.random.default_rng(20240703)
        n_reps = 150
        estimates = np.empty((n_reps, len(input_ids)), dtype=float)
        for r in range(n_reps):
            syn_groups = []
            for group, y in zip(context.optimisation_groups, preds):
                records = []
                for record in group.records:
                    pred = y[record.output_index, record.time_index]
                    s = np.sqrt(sigma_a**2 + sigma_m**2 * pred * pred)
                    noisy = float(pred + rng.normal(0.0, s))
                    records.append(replace(record, value=noisy))
                syn_groups.append(replace(group, records=tuple(records)))
            syn_groups = tuple(syn_groups)

            def objective(theta, groups=syn_groups):
                values = {i: float(v) for i, v in zip(input_ids, theta)}
                nll, ode_gradient, _ = context.optimise_loss_gradient(
                    groups,
                    values,
                    sigma=sigma,
                    sigma_mult=sigma_mult,
                )
                return nll, ode_gradient

            result = minimize(objective, true_model, jac=True, method="BFGS")
            estimates[r] = result.x

        emp_cov = np.cov(estimates.T)
        de = np.sqrt(np.diag(emp_cov))
        emp_corr = emp_cov / np.outer(de, de)
        rel_se_emp = de / np.abs(true_model)

        # Off-diagonal correlation and per-parameter relative standard errors.
        # At 150 replicates (fixed seed) the margins are comfortable: the
        # correlation matches to ~0.02 (tol 0.1) and the relative SEs to ~1%
        # (tol 20%).
        np.testing.assert_allclose(
            emp_corr[0, 1], corr_diag[0, 1], atol=0.1
        )
        np.testing.assert_allclose(rel_se_emp, rel_se_diag, rtol=0.2)

    def test_optimise_combined_noise_returns_two_sigmas(self):
        setup = self._exponential_data()
        model = setup["model"]
        input_ids = [variable.id for variable in setup["inputs"]]
        starting = [0.27, 1.45]
        bounds = ([0.16, 1.2], [0.3, 2.1])
        group_ids = [group.id for group in setup["groups"]]
        biomarker_type_ids = [setup["biomarker_type"].id]

        result = model.optimise(
            parameters=make_parameters(input_ids, starting, bounds),
            observations=make_observations(biomarker_type_ids, "combined"),
            subject_groups=group_ids,
            max_iterations=60,
        )

        n_outputs = len(result.sigma_variables)
        self.assertTrue(np.isfinite(result.loss))
        for key in (
            "sigma",
            "sigma_mult",
            "sigma_start",
            "sigma_mult_start",
            "sigma_use_log_space",
            "sigma_mult_use_log_space",
            "sigma_bounds",
            "sigma_bounds_mult",
        ):
            self.assertIsNotNone(getattr(result, key), key)
            self.assertEqual(len(getattr(result, key)), n_outputs, key)
        self.assertAlmostEqual(result.optimal[0], setup["true"][0], delta=0.06)

    def test_optimise_additive_has_no_second_sigma(self):
        setup = self._exponential_data()
        model = setup["model"]
        input_ids = [variable.id for variable in setup["inputs"]]
        result = model.optimise(
            parameters=make_parameters(
                input_ids, [0.27, 1.45], ([0.16, 1.2], [0.3, 2.1])
            ),
            observations=make_observations([setup["biomarker_type"].id]),
            subject_groups=[group.id for group in setup["groups"]],
            max_iterations=20,
        )
        self.assertIsNone(result.sigma_mult)
        self.assertIsNone(result.sigma_mult_start)
        self.assertIsNone(result.sigma_bounds_mult)
        self.assertIsNone(result.sigma_mult_use_log_space)

    def test_optimise_rejects_unknown_noise_model(self):
        setup = self._exponential_data()
        model = setup["model"]
        with self.assertRaisesMessage(ValueError, "Unknown noise model"):
            model.optimise(
                parameters=make_parameters(
                    [variable.id for variable in setup["inputs"]],
                    [0.27, 1.45],
                    ([0.16, 1.2], [0.3, 2.1]),
                ),
                observations=make_observations(
                    [setup["biomarker_type"].id], "not-a-model"
                ),
                subject_groups=[group.id for group in setup["groups"]],
                max_iterations=1,
            )

    def test_optimise_log_space_converges_to_true_values(self):
        """Optimising in log space reaches the same optimum as linear space."""
        setup = self._exponential_data()
        model = setup["model"]
        input_ids = [variable.id for variable in setup["inputs"]]
        true_values = setup["true"]
        starting = [0.27, 1.45]
        bounds = ([0.16, 1.2], [0.3, 2.1])

        result = model.optimise(
            parameters=make_parameters(
                input_ids, starting, bounds, use_log_space=[True, True]
            ),
            observations=make_observations([setup["biomarker_type"].id]),
            subject_groups=[group.id for group in setup["groups"]],
            max_iterations=80,
        )

        self.assertTrue(np.isfinite(result.loss))
        # optimal is reported in user (linear) space regardless of parameterisation
        self.assertAlmostEqual(result.optimal[0], true_values[0], delta=0.04)
        self.assertAlmostEqual(result.optimal[1], true_values[1], delta=0.18)

    def test_optimise_log_space_gradient_matches_finite_difference(self):
        """The log-space chain rule used in evaluateS1 (d(nll)/d log(v) =
        d(nll)/dv * v) matches a finite difference of the loss w.r.t. log(v)."""
        setup = self._exponential_data()
        input_ids = [variable.id for variable in setup["inputs"]]
        starting = [0.27, 1.45]
        bounds = ([0.16, 1.2], [0.3, 2.1])
        context = self._build_optimise_context(setup, starting, bounds)
        values_by_id = self._to_model_space_values_by_id(
            context, input_ids, starting
        )
        keys = list(values_by_id)
        base_vals = np.array([values_by_id[k] for k in keys], dtype=float)

        _, ode_gradient, _ = context.optimise_loss_gradient(
            context.optimisation_groups,
            values_by_id,
        )
        # Analytic gradient of the loss w.r.t. the log-space variable of param 0.
        analytic = float(ode_gradient[0] * base_vals[0])

        # Central finite difference w.r.t. z = log(v0): v0 -> v0 * exp(±h).
        h = 1e-6
        plus = dict(zip(keys, base_vals))
        minus = dict(zip(keys, base_vals))
        plus[keys[0]] = float(base_vals[0] * np.exp(h))
        minus[keys[0]] = float(base_vals[0] * np.exp(-h))
        loss_plus = context.optimise_loss(context.optimisation_groups, plus)
        loss_minus = context.optimise_loss(context.optimisation_groups, minus)
        numeric = (loss_plus - loss_minus) / (2.0 * h)

        self.assertAlmostEqual(analytic, numeric, delta=1e-3 * (1 + abs(numeric)))

    def test_optimise_log_space_gradient_descent(self):
        """Gradient descent runs through the evaluateS1 chain-rule path for a
        log-space parameter and reduces the loss."""
        setup = self._exponential_data()
        model = setup["model"]
        input_ids = [variable.id for variable in setup["inputs"]]
        starting = [0.27, 1.45]
        bounds = ([0.16, 1.2], [0.3, 2.1])

        context = self._build_optimise_context(setup, starting, bounds)
        starting_loss = context.optimise_loss(
            context.optimisation_groups,
            self._to_model_space_values_by_id(context, input_ids, starting),
        )

        result = model.optimise(
            parameters=make_parameters(
                input_ids, starting, bounds, use_log_space=[True, False]
            ),
            observations=make_observations([setup["biomarker_type"].id]),
            subject_groups=[group.id for group in setup["groups"]],
            max_iterations=200,
            method="gradient_descent",
        )

        self.assertTrue(np.isfinite(result.loss))
        self.assertLess(result.loss, starting_loss)

    def test_optimise_log_space_rejects_negative_lower_bound(self):
        setup = self._exponential_data()
        model = setup["model"]
        input_ids = [variable.id for variable in setup["inputs"]]
        with self.assertRaisesMessage(ValueError, "lower_bound >= 0"):
            model.optimise(
                parameters=make_parameters(
                    input_ids[:1], [0.2], ([-0.1], [0.3]), use_log_space=[True]
                ),
                observations=make_observations([setup["biomarker_type"].id]),
                subject_groups=[setup["groups"][0].id],
                max_iterations=1,
            )

    def test_optimise_log_space_zero_lower_bound_is_clamped(self):
        """A zero lower bound is clamped to a finite floor rather than log(0)."""
        setup = self._exponential_data()
        model = setup["model"]
        input_ids = [variable.id for variable in setup["inputs"]]

        result = model.optimise(
            parameters=make_parameters(
                input_ids[:1], [0.2], ([0.0], [0.3]), use_log_space=[True]
            ),
            observations=make_observations([setup["biomarker_type"].id]),
            subject_groups=[setup["groups"][0].id],
            max_iterations=25,
        )

        self.assertEqual(len(result.optimal), 1)
        self.assertTrue(np.isfinite(result.loss))

    def test_optimise_linear_sigma_matches_log_sigma(self):
        """Fitting the noise sigma in linear space reaches the same optimum as
        fitting it in log space (the parameterisation changes the path, not the
        result). The ODE parameters are pinned near their true values with tight
        bounds so the fitted sigma is the (deterministic) RMS residual and both
        parameterisations converge to it via gradient descent."""
        setup = self._exponential_data()
        model = setup["model"]
        input_ids = [variable.id for variable in setup["inputs"]]
        true_values = setup["true"]
        # Pin the ODE parameters near the truth so sigma is the free parameter.
        starting = list(true_values)
        bounds = (
            [v * 0.99 for v in true_values],
            [v * 1.01 for v in true_values],
        )

        def fit(sigma_use_log_space):
            return model.optimise(
                parameters=make_parameters(input_ids, starting, bounds),
                observations=[
                    ObservationInfo(
                        biomarker_type=setup["biomarker_type"].id,
                        noise_model="additive",
                        sigma=ParameterInfo(
                            starting=0.5,
                            lower_bound=0.0,
                            upper_bound=2.0,
                            use_log_space=sigma_use_log_space,
                        ),
                    )
                ],
                subject_groups=[group.id for group in setup["groups"]],
                max_iterations=300,
                method="gradient_descent",
            )

        log_result = fit(True)
        linear_result = fit(False)

        self.assertEqual(linear_result.sigma_use_log_space, [False])
        self.assertTrue(np.isfinite(linear_result.loss))
        self.assertGreater(linear_result.sigma[0], 0.0)
        # Both parameterisations should recover essentially the same noise sd.
        self.assertAlmostEqual(
            linear_result.sigma[0], log_result.sigma[0], delta=0.02
        )
