#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django import forms
from django.core.exceptions import ValidationError
from pkpdapp.models import Dataset, BiomarkerType, Project
from django.utils.translation import gettext as _
import pandas as pd

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
    def __init__(self, *args, **kwargs):
        if 'project' in kwargs:
            self.project_id = kwargs.pop('project')
        else:
            self.project_id = None

        super().__init__(*args, **kwargs)

    class Meta:
        model = Dataset
        fields = ['name', 'description', 'datetime', 'administration_type']

        error_messages = {
            'datetime': {
                'invalid': ('Enter a valid date/time. ' +
                            'For example, 2020-10-25 14:30:59.')
            }
        }

    file = forms.FileField(label='Data file', validators=[file_size],
                           help_text='csv format required')

    def clean_file(self):
        uploaded_file = self.cleaned_data.get("file")

        # error in file type
        if not uploaded_file.name.endswith('.csv'):
            raise forms.ValidationError(
                _((
                    'Error parsing file, '
                    '%(filename)s does not seem to be valid csv'
                )),
                code='invalid',
                params={'filename': uploaded_file.name},
            )

        # # error in columns
        # data = pd.read_csv(uploaded_file)
        # colnames = list(data.columns)
        # print(data)
        # print(colnames)
        # if len(colnames) > 4:
        #     raise forms.ValidationError(
        #         _((
        #             'Error parsing file, '
        #             '%(filename)s has too many columns. '
        #             'It should only have: subject id, time, biomarker type, '
        #             'value'
        #         )),
        #         code='invalid',
        #         params={'filename': uploaded_file.name},
        #     )
        # return data

    def save(self, commit=True):
        instance = super().save()
        if self.project_id is not None:
            project = Project.objects.get(id=self.project_id)
            project.pkpd_models.add(instance)
            if commit:
                project.save()

        return instance


class CreateNewBiomarkerUnit(forms.ModelForm):
    """
    A form to associate a unit with a predefined biomarker type name.
    """

    class Meta:
        model = BiomarkerType
        fields = ['name', 'unit', 'description']

    description = forms.CharField(
        widget=forms.Textarea(attrs={'rows': 2, 'cols': 25}),
        required=False
    )
