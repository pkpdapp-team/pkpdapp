#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from typing import TYPE_CHECKING, Any

import numpy as np

if TYPE_CHECKING:
    from pkpdapp.models import Distribution


class UncertaintySimulationMixin:
    DEFAULT_SIMULATION_QUANTILES = [0.05, 0.5, 0.95]

    _CONTINUOUS_COVARIATE_KINDS = frozenset({"weight", "age", "custom_cont"})

    def _covariate_group_mu(self, covariate_specs, group_config):
        """Return ``{mu_variable_id: population_median}`` for continuous covariates.

        The centring median is a per-population constant (not the empirical median
        of the drawn sample), so results are reproducible across sample sizes.
        """
        from pkpdapp.utils.weight_populations import (
            FEMALE,
            MALE,
            reference_median_weight,
        )

        mu_values = {}
        for spec in covariate_specs:
            if spec["mu_id"] is None:
                continue
            value = 1.0
            if group_config is not None:
                kind = spec["kind"]
                if kind == "weight":
                    region = group_config.get("region")
                    m2f = group_config.get("m2f_ratio")
                    m2f = 0.5 if m2f is None else m2f
                    value = m2f * reference_median_weight(region, MALE) + (
                        1.0 - m2f
                    ) * reference_median_weight(region, FEMALE)
                elif kind == "age":
                    age_min = group_config.get("age_min")
                    age_max = group_config.get("age_max")
                    if age_min is not None and age_max is not None:
                        value = (age_min + age_max) / 2.0
                elif kind == "custom_cont":
                    population = group_config["populations"].get(
                        spec["covariate_id"]
                    )
                    if population is not None and population.median is not None:
                        value = population.median
            mu_values[spec["mu_id"]] = float(value) if value else 1.0
        return mu_values

    def _sample_individual_covariates(self, covariate_specs, group_config, rng):
        """Draw one individual's covariate values as ``{input_variable_id: value}``.

        Sex is drawn once and reused so a person's weight (which depends on sex)
        and any sex covariate stay consistent. When ``group_config`` is ``None``
        (no virtual population) every covariate takes its neutral value so the
        covariate factor is 1.
        """
        from pkpdapp.utils.weight_populations import sample_weight

        values = {}
        if group_config is None:
            for spec in covariate_specs:
                values[spec["input_id"]] = (
                    1.0 if spec["kind"] in self._CONTINUOUS_COVARIATE_KINDS else 0.0
                )
            return values

        m2f = group_config.get("m2f_ratio")
        sex = 1 if (m2f is not None and rng.random() < m2f) else 0
        for spec in covariate_specs:
            kind = spec["kind"]
            if kind == "sex":
                values[spec["input_id"]] = float(sex)
            elif kind == "weight":
                values[spec["input_id"]] = sample_weight(
                    group_config.get("region"), sex, rng
                )
            elif kind == "age":
                age_min = group_config.get("age_min")
                age_max = group_config.get("age_max")
                if age_min is None or age_max is None:
                    values[spec["input_id"]] = 1.0
                else:
                    values[spec["input_id"]] = float(rng.uniform(age_min, age_max))
            elif kind == "custom_cont":
                population = group_config["populations"].get(spec["covariate_id"])
                if population is None or population.median is None:
                    values[spec["input_id"]] = 1.0
                else:
                    variance = population.variance or 0.0
                    values[spec["input_id"]] = float(
                        population.median * np.exp(rng.normal(0.0, np.sqrt(variance)))
                    )
            elif kind == "custom_cat":
                population = group_config["populations"].get(spec["covariate_id"])
                if population is None or not population.category_probabilities:
                    values[spec["input_id"]] = 0.0
                else:
                    probabilities = np.asarray(
                        population.category_probabilities, dtype=float
                    )
                    probabilities = probabilities / probabilities.sum()
                    values[spec["input_id"]] = float(
                        rng.choice(len(probabilities), p=probabilities)
                    )
        return values

    def _validate_quantiles(self, quantiles):
        if quantiles is None:
            quantiles = self.DEFAULT_SIMULATION_QUANTILES

        if len(quantiles) == 0:
            raise ValueError("quantiles must not be empty")

        invalid_quantiles = [q for q in quantiles if q < 0 or q > 1]
        if invalid_quantiles:
            raise ValueError("quantiles must be in range [0, 1]")

        return sorted(set(quantiles))

    def _validate_variable_distributions(self, variables, variable_distributions):
        """Validate every distribution before any sampling happens.

        ``simulate`` runs this up front so the sampling pipeline below can assume
        every distribution is valid. The typical value P for each variable is read
        from ``variables``. Raises ``ValueError`` (surfaced as HTTP 400) naming the
        offending variable.
        """
        for qname, distribution in variable_distributions.items():
            try:
                distribution.validate(variables[qname])
            except ValueError as e:
                raise ValueError(f"distribution for {qname}: {e}")

    def _sample_variables(self, variables, variable_distributions, rng, etas=None):
        """Return one Monte-Carlo draw of the distributed variables.

        ``etas`` maps each qname to a pre-drawn random effect; pass it for a
        correlated population (drawn jointly, see :meth:`_draw_correlated_etas`).
        When ``etas`` is ``None`` each ETA is drawn independently.
        """
        sampled_variables = {**variables}
        for qname, distribution in variable_distributions.items():
            # distributions are validated up front by simulate(); the typical value
            # P is the variable's value in ``variables``.
            if etas is None:
                sampled_variables[qname] = distribution.sample(variables[qname], rng)
            else:
                sampled_variables[qname] = distribution.apply(
                    variables[qname], etas[qname]
                )
        return sampled_variables

    @staticmethod
    def _nearest_psd(matrix):
        """Return the nearest positive-semi-definite matrix (Frobenius norm).

        User-entered pairwise correlations need not form a valid covariance
        matrix, so we symmetrise and clip any negative eigenvalues to zero before
        sampling. When the input is already PSD this is a no-op up to rounding.
        """
        symmetric = (matrix + matrix.T) / 2.0
        eigenvalues, eigenvectors = np.linalg.eigh(symmetric)
        eigenvalues = np.clip(eigenvalues, 0.0, None)
        psd = (eigenvectors * eigenvalues) @ eigenvectors.T
        return (psd + psd.T) / 2.0

    def _build_covariance_matrix(
        self, qnames, variable_distributions, variable_correlations
    ):
        """Build the PSD ETA covariance matrix for the ordered ``qnames``.

        Diagonal entries are each distribution's variance; off-diagonal entry
        (i, j) is ``rho_ij * std_i * std_j`` for any correlated pair, 0 otherwise.
        The result is corrected to the nearest PSD matrix so it can be sampled.
        """
        index = {qname: i for i, qname in enumerate(qnames)}
        stds = np.array(
            [np.sqrt(variable_distributions[qname].variance) for qname in qnames]
        )
        covariance = np.diag(stds**2)
        for (qname_1, qname_2), coefficient in variable_correlations.items():
            i, j = index[qname_1], index[qname_2]
            covariance[i, j] = covariance[j, i] = coefficient * stds[i] * stds[j]
        return self._nearest_psd(covariance)

    def _draw_correlated_etas(self, qnames, covariance, sample_count, rng):
        """Draw ``sample_count`` joint ETA vectors as ``{qname: eta}`` dicts."""
        draws = rng.multivariate_normal(
            np.zeros(len(qnames)),
            covariance,
            size=sample_count,
            check_valid="ignore",
        )
        return [
            {qname: draws[i, k] for k, qname in enumerate(qnames)}
            for i in range(sample_count)
        ]

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
        outputs: list[str] | None = None,
        variables: dict[str, float] | None = None,
        time_max: float | None = None,
        variable_distributions: dict[str, "Distribution"] | None = None,
        variable_correlations: dict[tuple[str, str], float] | None = None,
        covariate_specs: list[dict] | None = None,
        covariate_input_ids: list[int] | None = None,
        covariate_mu_ids: list[int] | None = None,
        sample_count: int = 200,
        seed: int | None = None,
        use_diffsol: bool = True,
        quantiles: list[float] | None = None,
    ) -> list[dict[str, Any]]:
        """Simulate the model over a Monte-Carlo population of parameter samples.

        ``variable_distributions`` maps a variable qname to a
        :class:`~pkpdapp.models.Distribution` instance. The typical value P for
        each distributed variable is taken from ``variables`` (which ``simulate``
        fills with the variable's default when not overridden). Distributions are
        assumed to be already validated (see
        ``_validate_variable_distributions``).

        ``variable_correlations`` maps a pair of qnames to the correlation
        coefficient of their ETAs. When any correlation is present the ETA vector
        is drawn jointly from the resulting covariance matrix; otherwise each ETA
        is drawn independently by ``Distribution.sample``.
        """
        if sample_count <= 0:
            raise ValueError("sample_count must be greater than 0")

        if time_max is None:
            time_max = self.get_time_max()

        if outputs is None:
            outputs = []

        if variables is None:
            variables = {}

        if variable_distributions is None:
            variable_distributions = {}

        if variable_correlations is None:
            variable_correlations = {}

        if covariate_specs is None:
            covariate_specs = []
        if covariate_input_ids is None:
            covariate_input_ids = []
        if covariate_mu_ids is None:
            covariate_mu_ids = []

        quantiles = self._validate_quantiles(quantiles)
        from pkpdapp.models.simulate_context import SimulateContext

        # dynamic inputs are the union of the ETA-distributed parameters and the
        # per-individual covariate inputs (value + centring median), deduped.
        dynamic_input_ids = list(
            dict.fromkeys(
                [self.variables.get(qname=qname).id for qname in variable_distributions]
                + list(covariate_input_ids)
                + list(covariate_mu_ids)
            )
        )
        rng = np.random.default_rng(seed)

        base_context = SimulateContext(
            model=self,
            outputs=outputs,
            variables=variables,
            dynamic_inputs=dynamic_input_ids,
            use_diffsol=use_diffsol,
            time_max=time_max,
        )

        time_context = base_context.get_variable_context(
            base_context.time_qname,
        )

        # when any pair is correlated, draw the ETA vector jointly from the
        # (nearest-PSD) covariance matrix; otherwise fall back to independent draws
        correlated_qnames = list(variable_distributions.keys())
        covariance = (
            self._build_covariance_matrix(
                correlated_qnames, variable_distributions, variable_correlations
            )
            if variable_correlations
            else None
        )

        uncertainty_results = []
        for simulation_group in base_context.simulation_groups:
            # each subject group is a virtual population of study_size (N)
            # individuals; fall back to sample_count when N is not set
            group_config = self._load_group_covariate_config(
                simulation_group.group_id
            )
            group_n = sample_count
            if group_config is not None and group_config.get("study_size"):
                group_n = group_config["study_size"]

            # centring medians are constant across the population
            mu_values = self._covariate_group_mu(covariate_specs, group_config)

            sampled_outputs = []
            t_eval = None
            correlated_etas = (
                self._draw_correlated_etas(
                    correlated_qnames, covariance, group_n, rng
                )
                if covariance is not None
                else None
            )
            for i in range(group_n):
                sampled_variables = self._sample_variables(
                    variables=variables,
                    variable_distributions=variable_distributions,
                    rng=rng,
                    etas=correlated_etas[i] if correlated_etas is not None else None,
                )
                sampled_values_by_id = {
                    base_context.get_variable_context(qname).id: (
                        sampled_value
                        * base_context.get_variable_context(
                            qname,
                        ).conversion_factor
                    )
                    for qname, sampled_value in sampled_variables.items()
                    if qname in variable_distributions
                }
                # per-individual covariate values (dimensionless model inputs)
                # plus the per-population centring medians
                sampled_values_by_id.update(
                    self._sample_individual_covariates(
                        covariate_specs, group_config, rng
                    )
                )
                sampled_values_by_id.update(mu_values)

                result = base_context.simulate_model(
                    simulation_group,
                    values_by_id=sampled_values_by_id,
                    t_eval=t_eval,
                )
                if i == 0 and time_context.id in result:
                    t_eval = (
                        np.asarray(result[time_context.id])
                        * time_context.conversion_factor
                    )
                sampled_outputs.append(result)

            aggregated_outputs = self._aggregate_sampled_outputs(
                sampled_outputs=sampled_outputs,
                quantiles=quantiles,
            )

            uncertainty_results.append(
                {
                    "time": self._extract_time_values(sampled_outputs[0]),
                    "outputs": aggregated_outputs,
                    "sample_count": group_n,
                    "group_id": simulation_group.group_id,
                }
            )

        return uncertainty_results
