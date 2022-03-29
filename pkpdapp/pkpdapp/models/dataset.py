#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from pkpdapp.models import Project


class Dataset(models.Model):
    """
    A PKPD dataset containing one or more :model:`pkpdapp.Biomarker`.
    """
    name = models.CharField(
        max_length=100,
        help_text='name of the dataset'
    )
    datetime = models.DateTimeField(
        help_text=(
            'date/time the experiment was conducted. '
            'All time measurements are relative to this date/time, ' +
            'which is in YYYY-MM-DD HH:MM:SS format. For example, ' +
            '2020-07-18 14:30:59'
        ),
        null=True, blank=True
    )
    description = models.TextField(
        help_text='short description of the dataset',
        blank=True, default=''
    )
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE,
        related_name='datasets',
        blank=True, null=True,
        help_text='Project that "owns" this model'
    )

    def __str__(self):
        return self.name

    def merge_protocols(self):
        unique_protocols = []
        protocol_subjects = []
        for subject in self.subjects.all():
            if subject.protocol is None:
                continue
            protocol = subject.protocol
            index = None
            for i, other_protocol in enumerate(unique_protocols):
                if protocol.is_same_as(other_protocol):
                    index = i
                    break
            if index is None:
                unique_protocols.append(protocol)
                protocol_subjects.append([subject])
            else:
                protocol_subjects[index].append(subject)
                protocol.delete()

        # migrate subjects to unique_protocols
        for protocol, subjects in zip(unique_protocols, protocol_subjects):
            for subject in subjects:
                subject.protocol = protocol
                subject.save()


