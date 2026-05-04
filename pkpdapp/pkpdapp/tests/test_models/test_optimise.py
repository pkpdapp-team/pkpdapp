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
    CombinedModel,
    Compound,
    Dataset,
    Dose,
    PharmacodynamicModel,
    Project,
    Protocol,
    Subject,
    SubjectGroup,
    Unit,
)


class TestOptimise(TestCase):
    TRUE_K = 0.22
    TRUE_SCALE = 1.7

    # creates a CombinedModel that represents exponential decay with two parameters
    # the model is created from an mmt string that defines the model in Myokit
    def _exponential_model(self):
        compound = Compound.objects.create(name="optimise demo")
        project = Project.objects.create(name="optimise project", compound=compound)
        dataset = Dataset.objects.create(name="optimise dataset", project=project)

        mmt = f"""
[[model]]
Central.amount = 0

[environment]
t = 0 in [h] bind time

[Central]
k = {self.TRUE_K} in [1/h]
scale = {self.TRUE_SCALE} in [1/mg]
dot(amount) = -k * amount in [mg]
response = scale * amount in [dimensionless]
"""
        pd_model = PharmacodynamicModel.objects.create(
            name="optimise exponential decay",
            description="Two-parameter exponential decay test model",
            mmt=mmt,
            time_max=18,
            project=project,
        )
        model = CombinedModel.objects.create(
            name="optimise combined model",
            pd_model=pd_model,
            project=project,
            time_max=18,
        )
        return model, dataset

    # creates a dataset with a single biomarker type and two subject groups
    # the two subject groups are each "dosed"
    # at t = 0 and t = n, where n is different for each group,
    # the dosing levels are different for each group, and the data is generated
    # from the exponential model with some noise uses myokit_model_mixin.simulate
    # to generate the data, and then adds some noise to it
    #
    # For manual verification, plots of the data and the simulation at the true parameter values should be generated and saved to files.
    def _exponential_data(self):
        model, dataset = self._exponential_model()
        project = model.project

        amount = model.variables.get(qname="Central.amount")
        response = model.variables.get(qname="Central.response")
        k = model.variables.get(qname="Central.k")
        scale = model.variables.get(qname="Central.scale")

        h = Unit.objects.get(symbol="h")
        mg = Unit.objects.get(symbol="mg")
        dimensionless = Unit.objects.get(symbol="")

        biomarker_type = BiomarkerType.objects.create(
            name="response",
            dataset=dataset,
            stored_unit=dimensionless,
            display_unit=dimensionless,
            stored_time_unit=h,
            display_time_unit=h,
            variable=response,
        )

        groups = [
            SubjectGroup.objects.create(
                name="Data-Group 1",
                id_in_dataset="1",
                dataset=dataset,
                project=project,
            ),
            SubjectGroup.objects.create(
                name="Data-Group 2",
                id_in_dataset="2",
                dataset=dataset,
                project=project,
            ),
        ]
        for index, group in enumerate(groups, start=1):
            Subject.objects.create(
                id_in_dataset=index,
                dataset=dataset,
                group=group,
            )

        dose_specs = {
            groups[0]: [(0.0, 10.0), (5.0, 4.0)],
            groups[1]: [(0.0, 7.0), (8.0, 6.0)],
        }
        for group, doses in dose_specs.items():
            protocol = Protocol.objects.create(
                name=f"{group.name} protocol",
                dataset=dataset,
                project=project,
                time_unit=h,
                amount_unit=mg,
                dose_type=Protocol.DoseType.DIRECT,
                variable=amount,
                group=group,
            )
            for start_time, dose_amount in doses:
                Dose.objects.create(
                    protocol=protocol,
                    start_time=start_time,
                    duration=0.1,
                    amount=dose_amount,
                )

        rng = np.random.default_rng(12345)
        plot_data = []
        for group in groups:
            subject = group.subjects.first()
            sim_times = np.linspace(0, 18, 200)
            sim_values = self._exponential_response(
                sim_times,
                dose_specs[group],
                self.TRUE_K,
                self.TRUE_SCALE,
            )
            selected_times = np.asarray(
                [0.0, 0.5, 1.5, 3.0, 4.5, 5.5, 6.5, 8.5, 10.0, 12.0, 14.0],
                dtype=float,
            )
            selected_values = self._exponential_response(
                selected_times,
                dose_specs[group],
                self.TRUE_K,
                self.TRUE_SCALE,
            )
            noise = rng.normal(
                loc=0.0,
                scale=0.02 * np.maximum(selected_values, 1.0),
            )
            observed_values = np.maximum(selected_values + noise, 1e-6)
            for t, value in zip(selected_times, observed_values):
                Biomarker.objects.create(
                    time=float(t),
                    subject=subject,
                    biomarker_type=biomarker_type,
                    value=float(value),
                )
            plot_data.append(
                (group.name, sim_times, sim_values, selected_times, observed_values)
            )

        self._write_manual_verification_plots(plot_data)

        return {
            "model": model,
            "biomarker_type": biomarker_type,
            "groups": groups,
            "inputs": [k, scale],
            "true": [self.TRUE_K, self.TRUE_SCALE],
        }

    @staticmethod
    def _exponential_response(times, doses, k, scale):
        amount = np.zeros_like(times, dtype=float)
        duration = 0.1
        for start_time, dose_amount in doses:
            rate = dose_amount / duration
            since_start = times - start_time
            during = (since_start >= 0) & (since_start <= duration)
            after = since_start > duration
            amount[during] += (rate / k) * (1 - np.exp(-k * since_start[during]))
            amount[after] += (
                (rate / k)
                * (1 - np.exp(-k * duration))
                * np.exp(-k * (since_start[after] - duration))
            )
        return scale * amount

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

        with self.assertRaises(ValueError):
            model.optimise(
                inputs=input_ids[:1],
                starting=[0.2],
                bounds=([0.1], [0.3]),
                biomarker_types=[setup["biomarker_type"].id],
                subject_groups=[setup["groups"][0].id],
                max_iterations=1,
            )

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
