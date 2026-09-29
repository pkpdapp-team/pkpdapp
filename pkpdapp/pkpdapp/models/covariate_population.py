#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import math

from django.db import models

# stored as the log-normal median + log-space variance, but defaulted from the
# user-facing arithmetic mean (1) and standard deviation (0.3) so the UI shows
# those round defaults for a new continuous covariate (mirrors
# pkpdapp.utils.lognormal.mean_std_to_median_logvar; kept inline to avoid a
# circular import from the models package).
_DEFAULT_CV2 = (0.3 / 1.0) ** 2
_DEFAULT_MEDIAN = 1.0 / math.sqrt(1.0 + _DEFAULT_CV2)
_DEFAULT_VARIANCE = math.log1p(_DEFAULT_CV2)


class CovariatePopulation(models.Model):
    """
    The distribution of a *custom* :class:`Covariate` within a single virtual
    population (one :class:`SubjectGroup`).

    Continuous covariates are sampled from a log-normal with the given
    ``median`` and ``variance``; categorical covariates are sampled from a
    categorical distribution with the given ``category_probabilities`` (one
    entry per category, index 0 is the base category).

    Standard weight/age/sex covariates are not stored here; their per-population
    parameters are fields on :class:`SubjectGroup`.
    """

    subject_group = models.ForeignKey(
        "SubjectGroup",
        on_delete=models.CASCADE,
        related_name="covariate_populations",
        help_text="subject group (virtual population) this distribution is for",
    )
    covariate = models.ForeignKey(
        "Covariate",
        on_delete=models.CASCADE,
        related_name="populations",
        help_text="custom covariate this distribution describes",
    )
    median = models.FloatField(
        default=_DEFAULT_MEDIAN,
        help_text="median value of the covariate (continuous covariates only)",
    )
    variance = models.FloatField(
        default=_DEFAULT_VARIANCE,
        help_text=(
            "variance of the log-normal random effect "
            "(continuous covariates only)"
        ),
    )
    category_probabilities = models.JSONField(
        default=list,
        blank=True,
        help_text=(
            "probability of each category (categorical covariates only); "
            "one entry per category, index 0 is the base category"
        ),
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["subject_group", "covariate"],
                name="unique_group_covariate",
            ),
        ]

    def get_project(self):
        return self.subject_group.get_project()

    def save(self, *args, **kwargs):
        # default a categorical covariate to a uniform distribution over its
        # categories when no probabilities have been provided
        from pkpdapp.models import Covariate

        if (
            self.covariate_id
            and not self.category_probabilities
            and self.covariate.type == Covariate.Type.CATEGORICAL
            and self.covariate.n_categories
        ):
            n = self.covariate.n_categories
            self.category_probabilities = [1.0 / n] * n
        super().save(*args, **kwargs)

    def copy(self, new_subject_group, new_covariate):
        """Copy this distribution onto ``new_subject_group`` / ``new_covariate``."""
        return CovariatePopulation.objects.create(
            subject_group=new_subject_group,
            covariate=new_covariate,
            median=self.median,
            variance=self.variance,
            category_probabilities=self.category_probabilities,
        )
