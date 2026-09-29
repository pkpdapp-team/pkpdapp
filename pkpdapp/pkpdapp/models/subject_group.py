#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.core.validators import MinValueValidator
from django.db import models


class SubjectGroup(models.Model):
    """
    Multiple subjects forming a single group or cohort.
    """

    name = models.CharField(max_length=100, help_text="name of the group")
    id_in_dataset = models.CharField(
        null=True,
        blank=True,
        max_length=20,
        help_text="unique identifier in the dataset",
    )
    dataset = models.ForeignKey(
        "Dataset",
        on_delete=models.CASCADE,
        related_name="groups",
        blank=True,
        null=True,
        help_text="Dataset that this group belongs to.",
    )
    project = models.ForeignKey(
        "Project",
        on_delete=models.CASCADE,
        related_name="groups",
        blank=True,
        null=True,
        help_text="Project that this group belongs to.",
    )

    # --- virtual-population fields (used for covariate simulation) ---------
    # These describe the population from which the standard weight/age/sex
    # covariates are sampled. They are mandatory with sensible defaults so every
    # group is a complete virtual population.

    class Region(models.TextChoices):
        US = "US", "United States"
        EU = "EU", "Europe"
        ASIA = "ASIA", "Asia"
        CUSTOM = "CUSTOM", "Custom"

    study_size = models.PositiveIntegerField(
        default=200,
        validators=[MinValueValidator(1)],
        help_text="number of virtual individuals (N) in this population",
    )
    age_min = models.FloatField(
        default=20,
        help_text="minimum age of the population (age is sampled uniformly)",
    )
    age_max = models.FloatField(
        default=60,
        help_text="maximum age of the population (age is sampled uniformly)",
    )
    m2f_ratio = models.FloatField(
        default=0.5,
        help_text="male-to-female ratio, i.e. probability an individual is male",
    )
    population_region = models.CharField(
        max_length=6,
        choices=Region.choices,
        default=Region.EU,
        help_text="region used to sample body weight",
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                name="subject_group_study_size_gte_1",
                condition=models.Q(study_size__gte=1),
            ),
        ]

    def get_project(self):
        return self.project

    def covariate_population_for(self, covariate):
        """Return the :class:`CovariatePopulation` describing ``covariate`` here.

        Built-in covariates (weight/age/sex) have no stored distribution: an
        ephemeral (unsaved) population carrying this group is returned so
        :meth:`Covariate.sample` can read the group's region / age range / m2f
        ratio. Custom covariates return their stored row, or ``None`` when the
        distribution has not been configured for this group.
        """
        from pkpdapp.models import CovariatePopulation

        if covariate.builtin:
            return CovariatePopulation(subject_group=self)
        return self.covariate_populations.filter(covariate=covariate).first()

    def __str__(self):
        return self.name

    def copy(self, new_protocol, new_project, new_dataset):
        """
        Create a copy of this subject group with the same values but a different
        protocol, project and dataset.
        """
        new_group = SubjectGroup.objects.create(
            name=self.name,
            id_in_dataset=self.id_in_dataset,
            dataset=new_dataset,
            project=new_project,
            study_size=self.study_size,
            age_min=self.age_min,
            age_max=self.age_max,
            m2f_ratio=self.m2f_ratio,
            population_region=self.population_region,
        )

        # copy subjects in this group
        for subject in self.subjects.all():
            subject.copy(new_protocol, new_dataset, new_group)
        return new_group
