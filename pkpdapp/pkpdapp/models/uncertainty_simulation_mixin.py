#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import numpy as np


class UncertaintySimulationMixin:
    DEFAULT_SIMULATION_QUANTILES = [0.05, 0.5, 0.95]

    def _validate_quantiles(self, quantiles):
        if quantiles is None:
            quantiles = self.DEFAULT_SIMULATION_QUANTILES

        if len(quantiles) == 0:
            raise ValueError("quantiles must not be empty")

        invalid_quantiles = [q for q in quantiles if q < 0 or q > 1]
        if invalid_quantiles:
            raise ValueError("quantiles must be in range [0, 1]")

        return sorted(set(quantiles))

    def _get_distribution_std(self, qname, distribution):
        mean = distribution.get("mean")
        variance = distribution.get("variance")
        std = distribution.get("std")

        if mean is None:
            raise ValueError(f"distribution for {qname} is missing mean")

        if variance is None and std is None:
            raise ValueError(
                f"distribution for {qname} must define variance or std"
            )

        if variance is not None and variance < 0:
            raise ValueError(f"distribution for {qname} has negative variance")

        if std is not None and std < 0:
            raise ValueError(f"distribution for {qname} has negative std")

        if std is None:
            std = float(np.sqrt(variance))

        return float(mean), float(std)

    def _sample_variables(self, variables, variable_distributions, rng):
        sampled_variables = {**variables}
        for qname, distribution in variable_distributions.items():
            mean, std = self._get_distribution_std(qname, distribution)
            sampled_variables[qname] = float(rng.normal(mean, std))
        return sampled_variables

    def _aggregate_sampled_outputs(self, sampled_outputs, quantiles):
        aggregated_outputs = {}
        for variable_id in sampled_outputs[0].keys():
            samples = np.array([output[variable_id] for output in sampled_outputs])
            quantile_values = {
                str(q): np.quantile(samples, q, axis=0).tolist() for q in quantiles
            }
            aggregated_outputs[variable_id] = {
                "mean": np.mean(samples, axis=0).tolist(),
                "std": np.std(samples, axis=0).tolist(),
                "quantiles": quantile_values,
            }
        return aggregated_outputs

    def _extract_time_values(self, output):
        time_values = []
        for variable_id, values in output.items():
            variable = self.variables.filter(pk=int(variable_id)).first()
            if variable and (variable.name == "time" or variable.name == "t"):
                time_values = values
                break
        return time_values

    def simulate_uncertainty(
        self,
        outputs=None,
        variables=None,
        time_max=None,
        variable_distributions=None,
        sample_count=200,
        seed=None,
        use_diffsol=True,
        quantiles=None,
    ):
        if sample_count <= 0:
            raise ValueError("sample_count must be greater than 0")

        if time_max is None:
            time_max = self.get_time_max()

        if outputs is None:
            outputs = []

        default_variables = {
            v.qname: v.get_default_value() for v in self.variables.filter(constant=True)
        }
        if variables is None:
            variables = default_variables
        else:
            variables = {
                **default_variables,
                **variables,
            }

        if variable_distributions is None:
            variable_distributions = {}

        for qname in variable_distributions.keys():
            self.variables.get(qname=qname)

        quantiles = self._validate_quantiles(quantiles)
        model_dosing_protocols, groups = self._get_model_dosing_protocols()
        rng = np.random.default_rng(seed)

        uncertainty_results = []
        for i, dosing_protocols in enumerate(model_dosing_protocols):
            sampled_outputs = []
            for _ in range(sample_count):
                sampled_variables = self._sample_variables(
                    variables=variables,
                    variable_distributions=variable_distributions,
                    rng=rng,
                )
                if use_diffsol:
                    sampled_output = self.simulate_model_diffsol(
                        variables=sampled_variables,
                        time_max=time_max,
                        outputs=outputs,
                        dosing_protocols=dosing_protocols,
                    )
                else:
                    sampled_output = self.simulate_model(
                        variables=sampled_variables,
                        time_max=time_max,
                        outputs=outputs,
                        dosing_protocols=dosing_protocols,
                    )
                sampled_outputs.append(sampled_output)

            aggregated_outputs = self._aggregate_sampled_outputs(
                sampled_outputs=sampled_outputs,
                quantiles=quantiles,
            )

            uncertainty_results.append(
                {
                    "time": self._extract_time_values(sampled_outputs[0]),
                    "outputs": aggregated_outputs,
                    "sample_count": sample_count,
                    "group_id": None if i == 0 else groups[i - 1].id,
                }
            )

        return uncertainty_results
