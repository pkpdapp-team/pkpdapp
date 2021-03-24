#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django import forms
from django.core.exceptions import ValidationError
from pkpdapp.models import (Dataset, BiomarkerType,
                            Project, Biomarker)
from django.utils.translation import gettext as _
import pandas as pd
from django.utils.html import format_html

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

        self._data = None
        super().__init__(*args, **kwargs)

    class Meta:
        model = Dataset
        fields = ['name', 'description', 'datetime']

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

        # error in columns
        data = pd.read_csv(uploaded_file)
        colnames = list(data.columns)

        required_cols = ['ID', 'TIME', 'YDESC', 'DV']
        error_cols = []
        for col in required_cols:
            if col not in colnames:
                error_cols.append(col)
        if len(error_cols) > 0:
            raise forms.ValidationError(
                _((
                    'Error parsing file, '
                    '%(filename)s does not have the following columns: '
                    '%(error_cols)s'
                )),
                code='invalid',
                params={'filename': uploaded_file.name,
                        'error_cols': error_cols},
            )

        # check for missing data and drop any rows where data are missing
        num_missing = data.isna().sum().sum()
        if num_missing > 0:
            if not self.instance.id and "warn_missing_data" not in self.data:
                # creates entry in self.data if a user tries to save again
                self.add_error('file', format_html(
                    'Warning! There are ' + str(num_missing) + ' missing data '
                    'values in file which will be dropped during upload.'
                    ' To add the dataset anyway, please save again.'
                    '<input type="hidden" id="warn-missing-data"'
                    'name="warn_missing_data" value="0"/>')
                )
            data = data.dropna()
        self._data = data
        return data

    def save(self, commit=True):
        instance = super().save()
        if self.project_id is not None:
            project = Project.objects.get(id=self.project_id)
            project.datasets.add(instance)
            if commit:
                project.save()

        # save default biomarker types
        data = self._data
        bts_unique = data["YDESC"].unique().tolist()
        biomarker_types = []
        for i in range(len(bts_unique)):
            biomarker_types.append(BiomarkerType(
                name=bts_unique[i],
                description="",
                dataset=instance
            ))
        [bm.save() for bm in biomarker_types]

        # save each row of data
        biomarker_index = {}
        for i, b in enumerate(bts_unique):
            biomarker_index[b] = i
        for index, row in data.iterrows():
            index = biomarker_index[row['YDESC']]
            biomarker = Biomarker(
                time=row['TIME'],
                subject_id=row['ID'],
                value=row['DV'],
                biomarker_type=biomarker_types[index]
            )
            biomarker.save()

        # handle dosing

        return instance


class CreateNewBiomarkerType(forms.ModelForm):
    """
    A form to associate a unit with a predefined biomarker type name.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    class Meta:
        model = BiomarkerType
        fields = ['description']

    symbol = forms.CharField(label='Unit', required=False)

    description = forms.CharField(
        widget=forms.Textarea(attrs={'rows': 2, 'cols': 25}),
        required=False
    )
