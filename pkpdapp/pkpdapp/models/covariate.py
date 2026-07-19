#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import numpy as np
from django.db import models


class Covariate(models.Model):
    """
    A definition of a covariate together with the logic for sampling an
    individual's covariate value from a :class:`CovariatePopulation`.

    Custom covariates (e.g. albumin, GFR, ethnicity) are stored as rows and
    pointed at by ``CUSTOM_CONT_COVARIATE`` / ``CUSTOM_CAT_COVARIATE`` derived
    variables; their per-population distributions are stored in
    :class:`CovariatePopulation`.

    The three standard covariates (weight, age, sex) are represented by ephemeral
    (unsaved) instances built by :meth:`DerivedVariable.get_covariate`; their
    per-population parameters are read from the :class:`SubjectGroup` via an
    ephemeral :class:`CovariatePopulation` (see
    :meth:`SubjectGroup.covariate_population_for`).
    """

    class Type(models.TextChoices):
        CONTINUOUS = "CONT", "Continuous"
        CATEGORICAL = "CAT", "Categorical"

    class Builtin(models.TextChoices):
        WEIGHT = "WT", "Weight"
        AGE = "AGE", "Age"
        SEX = "SEX", "Sex"

    project = models.ForeignKey(
        "Project",
        on_delete=models.CASCADE,
        related_name="covariates",
        null=True,
        blank=True,
        help_text="Project that this covariate belongs to.",
    )
    name = models.CharField(
        max_length=100,
        help_text="name of the covariate (e.g. albumin)",
    )
    type = models.CharField(
        max_length=4,
        choices=Type.choices,
        default=Type.CONTINUOUS,
        help_text="whether the covariate is continuous or categorical",
    )
    builtin = models.CharField(
        max_length=3,
        choices=Builtin.choices,
        blank=True,
        default="",
        help_text="standard covariate kind (weight/age/sex); blank for custom",
    )
    n_categories = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="number of categories (categorical covariates only)",
    )
    category_names = models.JSONField(
        null=True,
        blank=True,
        help_text=(
            "optional labels for each category (categorical covariates only); "
            "index 0 is the base category"
        ),
    )
    unit = models.ForeignKey(
        "Unit",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="covariates",
        help_text="unit of the covariate (continuous covariates only)",
    )

    def get_project(self):
        return self.project

    def __str__(self):
        return self.name

    @property
    def is_continuous(self):
        return self.type == self.Type.CONTINUOUS

    def sample(self, population, rng, sex=None):
        """Draw one individual's value of this covariate.

        ``population`` is a :class:`CovariatePopulation` (a real row for custom
        covariates, an ephemeral one carrying the :class:`SubjectGroup` for
        built-ins), or ``None`` when the group has no configured distribution, in
        which case the neutral value (covariate factor 1) is returned. ``sex``
        is the individual's already-drawn sex (0 female, 1 male) so weight (which
        depends on sex) stays consistent with the sampled sex.
        """
        if population is None:
            return 0.0 if self.type == self.Type.CATEGORICAL else 1.0

        if self.builtin == self.Builtin.WEIGHT:
            from pkpdapp.utils.weight_populations import sample_weight

            region = population.subject_group.population_region
            return sample_weight(region, sex, rng)

        if self.builtin == self.Builtin.AGE:
            group = population.subject_group
            return float(rng.uniform(group.age_min, group.age_max))

        if self.builtin == self.Builtin.SEX:
            if sex is not None:
                return float(sex)
            return float(1 if rng.random() < population.subject_group.m2f_ratio else 0)

        if self.type == self.Type.CATEGORICAL:
            weights = np.asarray(population.category_probabilities, dtype=float)
            weights = weights / weights.sum()
            return float(rng.choice(len(weights), p=weights))

        # custom continuous covariate: log-normal about the population median
        return float(
            population.median * np.exp(rng.normal(0.0, np.sqrt(population.variance)))
        )

    def centering_value(self, population):
        """Return the population median used to centre a continuous covariate.

        Deterministic (not the empirical median of the drawn sample), so results
        reproduce across sample sizes and seeds. Returns 1 when there is nothing
        to centre against (so the covariate factor collapses to 1).
        """
        if population is None:
            return 1.0

        if self.builtin == self.Builtin.WEIGHT:
            from pkpdapp.utils.weight_populations import (
                FEMALE,
                MALE,
                reference_median_weight,
            )

            group = population.subject_group
            region = group.population_region
            m2f = group.m2f_ratio
            return m2f * reference_median_weight(region, MALE) + (
                1.0 - m2f
            ) * reference_median_weight(region, FEMALE)

        if self.builtin == self.Builtin.AGE:
            group = population.subject_group
            return (group.age_min + group.age_max) / 2.0

        return population.median

    def copy(self, new_project):
        """Create a copy of this covariate in ``new_project``."""
        return Covariate.objects.create(
            project=new_project,
            name=self.name,
            type=self.type,
            builtin=self.builtin,
            n_categories=self.n_categories,
            category_names=self.category_names,
            unit=self.unit,
        )
