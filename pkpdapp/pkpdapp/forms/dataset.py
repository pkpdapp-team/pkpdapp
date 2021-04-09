#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django import forms
from django.core.exceptions import ValidationError
from pkpdapp.models import (Dataset, BiomarkerType, StandardUnit, Dose,
                            Project, Biomarker, Compound, Protocol, Unit)
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

        # all columns in Roche data format
        required_cols = ['ID',
                         'STUDYID',
                         'AMT',
                         'COMPOUND',
                         'TIME',
                         'TIME_UNIT',  # not in Roche list but seems needed
                         'YTYPE',
                         'YDESC',
                         'DV',
                         'UNIT',  # not in Roche list but seems needed
                         'LLOQ',
                         'EVID',
                         'ADA_T',
                         'COV',
                         'COV_T']
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

        # check that time unit is only h or d
        time_units = data['TIME_UNIT'].unique().tolist()
        error_tunits = []
        for t_unit in time_units:
            if t_unit not in ['h', 'd', '.', 'hours']:
                error_tunits.append(t_unit)
        if len(error_tunits) > 0:
            raise forms.ValidationError(
                _((
                    'Error parsing file, '
                    '%(filename)s contains the following unknown time units: '
                    '%(error_tunits)s'
                )),
                code='invalid',
                params={'filename': uploaded_file.name,
                        'error_tunits': error_tunits},
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
        bts_unique = data[['YDESC', 'UNIT']].drop_duplicates()
        for index, row in bts_unique.iterrows():
            if row['UNIT'] == ".":
                BiomarkerType.objects.create(
                    name=row['YDESC'],
                    description="",
                    dataset=instance)
            else:
                unit_query = StandardUnit.objects.filter(symbol=row['UNIT'])
                if not unit_query:
                    unit = StandardUnit(symbol=row['UNIT'])
                    unit.save()
                else:
                    unit = unit_query[0]
                BiomarkerType.objects.create(
                    name=row['YDESC'],
                    description="",
                    unit=unit,
                    dataset=instance)

        biomarker_index = {}
        for i, b in enumerate(bts_unique):
            biomarker_index[b] = i
        # save each row of data as either biomarker or dose
        for index, row in data.iterrows():
            if row['TIME_UNIT'] != ".":
                time_unit = Unit.objects.get(symbol=row['TIME_UNIT'])
            else:  # assume hours as default
                time_unit = Unit.objects.get(symbol='h')
            value = row['DV']
            subject_id = row['ID']
            if value != ".":  # measurement observation
                Biomarker.objects.create(
                    time=time_unit.multiplier * row['TIME'],
                    subject_id=subject_id,
                    value=row['DV'],
                    biomarker_type=BiomarkerType.objects.get(
                        name=row['YDESC'],
                        dataset=instance)
                )
            else:  # dose observation
                compound_str = row['COMPOUND']
                try:
                    compound = Compound.objects.get(name=compound_str)
                except Compound.DoesNotExist:
                    compound = Compound.objects.create(
                        name=compound_str
                    )
                try:
                    protocol = Protocol.objects.get(
                        dataset=instance,
                        subject_id=subject_id,
                        compound=compound
                    )
                except Protocol.DoesNotExist:
                    protocol = Protocol.objects.create(
                        name='{}-{}-{}'.format(
                            instance.name,
                            compound.name,
                            subject_id
                        ),
                        compound=compound,
                        dataset=instance,
                        subject_id=subject_id,
                    )
                start_time = time_unit.multiplier * float(row['TIME'])
                amount = float(row['AMT'])
                Dose.objects.create(
                    start_time=start_time,
                    amount=amount,
                    protocol=protocol,
                )
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
