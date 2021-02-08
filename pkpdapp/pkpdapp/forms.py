#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django import forms
from pkpdapp.models.dataset import ADMINISTRATION_TYPE_CHOICES
from django.core.exceptions import ValidationError
from pkpdapp.models import Dataset

MAX_UPLOAD_SIZE = "5242880"


def file_size(value):
    limit = 50 * 1024 * 1024
    if value.size > limit:
        raise ValidationError('File too large. Size should not exceed 50 MiB.')


class CreateNewDataset(forms.ModelForm):
    """
    A form to create a new :model:`pkpdapp.Dataset`, which allows a user to
    upload their data from a file.
    """

    class Meta:
        model = Dataset
        fields = ['name', 'description', 'datetime', 'administration_type']

        error_messages = {
            'datetime': {
                'invalid': ('Enter a valid date/time. ' +
                            'For example, 2020-10-25 14:30:59.')
            }
        }

    file = forms.FileField(label='Data file', validators=[file_size])


class CreateNewBiomarkerUnit(forms.Form):
    """
    A form to associate a unit with a predefined biomarker type name.
    """
    UNIT_CHOICES = [
        ('mg', 'mg'),
        ('g', 'g'),
        ('cm3', 'cm^3'),
    ]
    unit = forms.ChoiceField(
        label='',
        choices=UNIT_CHOICES
    )

    description = forms.CharField(
        widget=forms.Textarea(attrs={'rows': 2, 'cols': 25}),
        label='Description',
        required=False
    )
