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

    def get_project(self):
        return self.project

    def __str__(self):
        return self.name

    def copy(self, new_protocol, new_project):
        """
        Create a copy of this subject group with the same values but a different
        protocol, project and dataset.
        """
        print(f"copying group {self.name} for protocol {new_protocol.name}")
        new_dataset = new_project.datasets.first()
        new_group = SubjectGroup.objects.create(
            name=self.name,
            id_in_dataset=self.id_in_dataset,
            dataset=new_dataset,
            project=new_project,
        )

        # copy subjects in this group
        for subject in self.subjects.all():
            subject.copy(new_protocol, new_dataset, new_group)
        return new_group
