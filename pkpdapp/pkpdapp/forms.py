#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django import forms
from pkpdapp.models.dataset import ADMINISTRATION_TYPE_CHOICES
from pkpdapp.models import PkpdModel
from django.core.exceptions import ValidationError
import xml.etree.ElementTree as ET

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
        required=False,
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


def sbml_content_validator(sbml_file):
    # check if file is xml by trying to parse it
    try:
        ET.parse(sbml_file).getroot()
        # make sure to reset the read position so we can
        # read it later in the save
        # TODO: can we save this text?
        sbml_file.file.seek(0)
    except ET.ParseError:
        raise forms.ValidationError("Error parsing sbml")


class CreateNewPkpdModel(forms.ModelForm):
    """
    A form to create a new :model:`pkpdapp.PkpdModel`, which allows a user to
    upload their sbml from a file.
    """
    sbml = forms.FileField(validators=[sbml_content_validator])

    class Meta:
        model = PkpdModel
        fields = ('name', 'description', 'model_type', 'sbml')

    def save(self, commit=True):
        sbml_file = self.cleaned_data.get("sbml")

        sbml_txt = str(sbml_file.read())

        if sbml_txt:
            self.instance.sbml = sbml_txt

        return super().save(commit)
