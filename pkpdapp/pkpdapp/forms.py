from django import forms
from pkpdapp.models.dataset import ADMINISTRATION_TYPE_CHOICES
from django.template.defaultfilters import filesizeformat
from django.utils.translation import ugettext_lazy as _
from django.conf import settings
from django.core.exceptions import ValidationError

MAX_UPLOAD_SIZE = "5242880"


def file_size(value):
    limit = 50 * 1024 * 1024
    if value.size > limit:
        raise ValidationError('File too large. Size should not exceed 50 MiB.')


class CreateNewDataset(forms.Form):
    """
    A form to create a new :model:`pkpdapp.Dataset`, which allows a user to
    upload their data from a file.
    """

    name = forms.CharField(label='Name',
                           max_length=100, help_text='name of the dataset')

    description = forms.CharField(
        widget=forms.Textarea,
        label='Description',
        help_text='short description of the dataset',
        required=False
    )

    datetime = forms.DateTimeField(
        label='Date-time',
        help_text=(
            'Date/time the experiment was conducted. ' +
            'All time measurements are relative to this date/time.'
        ),
        error_messages={
            'required': 'This field is required',
            'invalid': ('Enter a valid date/time. ' +
                        'For example, 2020-10-25 14:30:59.')
        }
    )

    administration_type = forms.ChoiceField(
        label='Administration type',
        choices=ADMINISTRATION_TYPE_CHOICES,
        help_text='method of drug administration'
    )

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
