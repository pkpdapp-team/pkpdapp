#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models


class Covariate(models.Model):
    """
    A project-scoped definition of a *custom* covariate (e.g. albumin,
    glomerular filtration rate, ethnicity).

    The three standard covariates (weight, age, sex) are built in and do not
    need a ``Covariate`` row: they are represented directly by the
    ``WEIGHT_COVARIATE`` / ``AGE_COVARIATE`` / ``SEX_COVARIATE`` types of
    :class:`DerivedVariable` and their per-population parameters live on the
    :class:`SubjectGroup`. This model only describes user-defined covariates,
    which the ``CUSTOM_CONT_COVARIATE`` / ``CUSTOM_CAT_COVARIATE`` derived
    variables point at, and whose per-population distributions are stored on
    :class:`CovariatePopulation`.
    """

    class Type(models.TextChoices):
        CONTINUOUS = "CONT", "Continuous"
        CATEGORICAL = "CAT", "Categorical"

    project = models.ForeignKey(
        "Project",
        on_delete=models.CASCADE,
        related_name="covariates",
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

    def copy(self, new_project):
        """Create a copy of this covariate in ``new_project``."""
        return Covariate.objects.create(
            project=new_project,
            name=self.name,
            type=self.type,
            n_categories=self.n_categories,
            category_names=self.category_names,
            unit=self.unit,
        )
