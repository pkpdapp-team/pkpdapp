from django import forms
from pkpdapp.models.dataset import ADMINISTRATION_TYPE_CHOICES


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
        help_text='short description of the dataset'
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

    file = forms.FileField(label='Data file')


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
