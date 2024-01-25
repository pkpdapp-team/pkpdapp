#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from datetime import timezone
from django.db import models
from django.contrib.auth.models import User
from django.urls import reverse


class Project(models.Model):
    """
    A project, containing multiple :model:`pkpdapp.Dataset`,
    :model:`pkpdapp.PkpdModel` and users.
    """

    name = models.CharField(max_length=100, help_text="name of the project")
    description = models.TextField(
        help_text="short description of the project", blank=True, default=""
    )
    users = models.ManyToManyField(
        User, through="ProjectAccess", help_text="users with access to this project"
    )

    compound = models.OneToOneField(
        "Compound",
        on_delete=models.CASCADE,
    )

    created = models.DateTimeField(auto_now_add=True)

    # species is a enum field
    class Species(models.TextChoices):
        MOUSE = "M", "Mouse"
        RAT = "R", "Rat"
        HUMAN = "H", "Human"
        MONKEY = "K", "Monkey"
        OTHER = "O", "Other"

    species = models.CharField(
        max_length=1,
        choices=Species.choices,
        default=Species.OTHER,
        help_text="subject species",
    )

    def get_absolute_url(self):
        return reverse("project-detail", kwargs={"pk": self.pk})

    def __str__(self):
        return str(self.name)

    def copy(self, projectAccess=None):
        """
        Copy the project, including all datasets, models and users.
        """
        new_name = f"Copy of {self.name}"
        new_description = self.description
        new_created = timezone.now()
        new_compound = self.compound.copy()
        new_project = Project.objects.create(
            name=new_name,
            description=new_description,
            species=self.species,
            compound=new_compound,
            created=new_created,
        )
        # for dataset in self.dataset_set.all():
        #     dataset.copy(new_project)
        for model in self.pk_models.all():
            model.copy(new_project)
        if projectAccess is None:
            for userAccess in self.projectaccess_set.all():
                userAccess.copy(new_project)
        else:
            for a in projectAccess:
                a.project = new_project
                a.save()
            self.projectaccess_set.set(projectAccess)
        return new_project


class ProjectAccess(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    read_only = models.BooleanField(
        default=False, help_text="True if user has read access only"
    )

    class Meta:
        unique_together = (
            "user",
            "project",
        )

    def get_project(self):
        return self.project

    def copy(self, project):
        return ProjectAccess.objects.create(
            user=self.user,
            project=project,
            read_only=self.read_only,
        )
