#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from pathlib import Path

import numpy as np
from django.test import TestCase
from pkpdapp.models import (
    Biomarker,
    BiomarkerType,
)
from pkpdapp.tests.optimise_fixtures import (
    create_exponential_data,
)


class TestOptimise(TestCase):
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

            time_values = np.asarray(group["t_eval"], dtype=float)
            axis.plot(
                time_values, true_prediction[0], label="True parameter prediction"
            )
            axis.plot(
                time_values,
                starting_prediction[0],
                label="Starting parameter prediction",
            )

            record_times = [
                record["time"]
                for record in group["records"]
                if record["output_index"] == 0
            ]
            record_values = [
                record["value"]
                for record in group["records"]
                if record["output_index"] == 0
            ]
            axis.scatter(record_times, record_values, label="Observed data", s=15)
            axis.set_xlabel("Time (h)")
            axis.set_ylabel(group["outputs"][0])
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
        input_variables = setup["inputs"]
        true_values = setup["true"]
        starting = [0.27, 1.45]
        bounds = ([0.16, 1.2], [0.3, 2.1])
        group_ids = [group.id for group in setup["groups"]]
        biomarker_type_ids = [setup["biomarker_type"].id]

        prepared_groups = model._prepare_optimise_groups(
            biomarker_type_ids,
            group_ids,
        )

        starting_predictions = [
            model._optimise_predict(group, input_variables, starting)
            for group in prepared_groups
        ]

        true_predictions = [
            model._optimise_predict(group, input_variables, true_values)
            for group in prepared_groups
        ]

        for true_prediction, starting_prediction, group in zip(
            true_predictions,
            starting_predictions,
            prepared_groups,
        ):
            expected_shape = (len(group["outputs"]), len(group["t_eval"]))
            self.assertEqual(true_prediction.shape, expected_shape)
            self.assertEqual(starting_prediction.shape, expected_shape)

        self._write_optimise_prediction_plots(
            prepared_groups,
            true_predictions,
            starting_predictions,
        )

        starting_loss = model._optimise_loss(
            prepared_groups,
            input_variables,
            starting,
        )
        true_loss = model._optimise_loss(
            prepared_groups,
            input_variables,
            true_values,
        )

        self.assertLess(true_loss, starting_loss)

        result = model.optimise(
            inputs=[variable.id for variable in input_variables],
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

        unmapped = BiomarkerType.objects.create(
            name="unmapped",
            dataset=setup["biomarker_type"].dataset,
            stored_unit=setup["biomarker_type"].stored_unit,
            display_unit=setup["biomarker_type"].display_unit,
            stored_time_unit=setup["biomarker_type"].stored_time_unit,
            display_time_unit=setup["biomarker_type"].display_time_unit,
        )
        with self.assertRaises(ValueError):
            model.optimise(
                inputs=input_ids,
                starting=[0.2, 1.5],
                bounds=([0.1, 1.0], [0.3, 2.0]),
                biomarker_types=[unmapped.id],
                subject_groups=[setup["groups"][0].id],
                max_iterations=1,
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

        groups = setup["model"]._prepare_optimise_groups(
            [setup["biomarker_type"].id],
            [group.id for group in setup["groups"]],
        )
        loss = setup["model"]._optimise_loss(
            groups,
            setup["inputs"],
            setup["true"],
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

        prepared_groups = model._prepare_optimise_groups(biomarker_type_ids, group_ids)
        starting_loss = model._optimise_loss(
            prepared_groups,
            setup["inputs"],
            starting,
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

        prepared_groups = model._prepare_optimise_groups(biomarker_type_ids, group_ids)
        starting_loss = model._optimise_loss(
            prepared_groups,
            setup["inputs"],
            starting,
        )

        # Verify that sensitivity helper returns correctly shaped arrays.
        y, y_prime = model._optimise_predict_with_sens(
            prepared_groups[0],
            setup["inputs"],
            starting,
        )
        n_times = len(prepared_groups[0]["t_eval"])
        n_outputs = len(prepared_groups[0]["outputs"])
        n_params = len(setup["inputs"])
        self.assertEqual(y.shape, (n_times, n_outputs))
        self.assertEqual(y_prime.shape, (n_times, n_outputs, n_params))
        self.assertTrue(np.all(np.isfinite(y)))
        self.assertTrue(np.all(np.isfinite(y_prime)))

        # Verify that _optimise_loss_gradient returns scalar loss + vector gradient.
        total_loss, total_gradient = model._optimise_loss_gradient(
            prepared_groups,
            setup["inputs"],
            starting,
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
