#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models


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
        null=True,
        blank=True,
        help_text="median value of the covariate (continuous covariates only)",
    )
    variance = models.FloatField(
        null=True,
        blank=True,
        help_text=(
            "variance of the log-normal random effect "
            "(continuous covariates only)"
        ),
    )
    category_probabilities = models.JSONField(
        null=True,
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

    def copy(self, new_subject_group, new_covariate):
        """Copy this distribution onto ``new_subject_group`` / ``new_covariate``."""
        return CovariatePopulation.objects.create(
            subject_group=new_subject_group,
            covariate=new_covariate,
            median=self.median,
            variance=self.variance,
            category_probabilities=self.category_probabilities,
        )
