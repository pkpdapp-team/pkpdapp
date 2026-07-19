#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

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
    # covariates are sampled. They are nullable so dataset-derived groups (which
    # have no virtual population) fall back to the default sample count.

    class Region(models.TextChoices):
        US = "US", "United States"
        EU = "EU", "Europe"
        ASIA = "ASIA", "Asia"
        CUSTOM = "CUSTOM", "Custom"

    study_size = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="number of virtual individuals (N) in this population",
    )
    age_min = models.FloatField(
        null=True,
        blank=True,
        help_text="minimum age of the population (age is sampled uniformly)",
    )
    age_max = models.FloatField(
        null=True,
        blank=True,
        help_text="maximum age of the population (age is sampled uniformly)",
    )
    m2f_ratio = models.FloatField(
        null=True,
        blank=True,
        help_text="male-to-female ratio, i.e. probability an individual is male",
    )
    population_region = models.CharField(
        max_length=6,
        choices=Region.choices,
        null=True,
        blank=True,
        help_text="region used to sample body weight",
    )

    def get_project(self):
        return self.project

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
