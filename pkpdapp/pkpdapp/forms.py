#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django import forms
from pkpdapp.models import (
    DosedPharmacokineticModel, PharmacodynamicModel,
    Project, Dose, Protocol, Dataset,
)
from django.core.exceptions import ValidationError
import xml.etree.ElementTree as ET
import pkpdapp.erlotinib as erlo

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
                           max_length=100,
                           help_text='name of the dataset')

    description = forms.CharField(widget=forms.Textarea,
                                  label='Description',
                                  help_text='short description of the dataset',
                                  required=False)

    datetime = forms.DateTimeField(
        label='Date-time',
        required=False,
        help_text=('Date/time the experiment was conducted. ' +
                   'All time measurements are relative to this date/time.'),
        error_messages={
            'required':
            'This field is required',
            'invalid':
            ('Enter a valid date/time. ' + 'For example, 2020-10-25 14:30:59.')
        })

    administration_type = forms.ChoiceField(
        label='Administration type',
        help_text='method of drug administration')

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
    unit = forms.ChoiceField(label='', choices=UNIT_CHOICES)

    description = forms.CharField(
        widget=forms.Textarea(
            attrs={
                'rows': 2,
                'cols': 25
            }
        ),
        label='Description',
        required=False
    )


class CreateNewDosedPharmokineticModel(forms.ModelForm):
    """
    A form to create a new
    :model:`pkpdapp.PharmacodynamicModel`, which allows a user to
    upload their SBML from a file.

    Can pass an additional kwarg 'project', which adds the new model to this
    project id
    """
    def __init__(self, *args, **kwargs):
        if 'project' in kwargs:
            self.project_id = kwargs.pop('project')
            self.project = Project.objects.get(id=self.project_id)
            protocols_from_datasets = Protocol.objects.filter(
                dataset__in=Dataset.objects.filter(project=self.project)
            )
            protocol_queryset = \
                Protocol.objects.filter(project=self.project) \
                | protocols_from_datasets
        else:
            self.project_id = None
            protocol_queryset = Protocol.objects.none()
        super().__init__(*args, **kwargs)
        self.fields['protocol'].queryset = protocol_queryset



    class Meta:
        model = DosedPharmacokineticModel
        fields = [
            'pharmacokinetic_model', 'dose_compartment', 'protocol',
        ]

    def save(self, commit=True):
        instance = super().save()
        if self.project_id is not None:
            project = Project.objects.get(id=self.project_id)
            project.pk_models.add(instance)
            if commit:
                project.save()

        return instance


class CreateNewPharmodynamicModel(forms.ModelForm):
    """
    A form to create a new
    :model:`pkpdapp.PharmacodynamicModel`, which allows a user to
    upload their SBML from a file.

    Can pass an additional kwarg 'project', which adds the new model to this
    project id
    """
    def __init__(self, *args, **kwargs):
        if 'project' in kwargs:
            self.project_id = kwargs.pop('project')
        else:
            self.project_id = None

        super().__init__(*args, **kwargs)

    class Meta:
        model = PharmacodynamicModel
        fields = ('name', 'description', 'sbml')

    sbml = forms.FileField()

    def clean_sbml(self):
        sbml_file = self.cleaned_data.get("sbml")
        try:
            sbml_et = ET.parse(sbml_file).getroot()
            sbml = ET.tostring(sbml_et, encoding='unicode', method='xml')
        except ET.ParseError:
            raise forms.ValidationError(
                _(('Error parsing file, '
                   '%(filename)s does not seem to be valid XML')),
                code='invalid',
                params={'filename': sbml_file.name},
            )
        return sbml

    def save(self, commit=True):
        instance = super().save()
        if self.project_id is not None:
            project = Project.objects.get(id=self.project_id)
            project.pd_models.add(instance)
            if commit:
                project.save()

        return instance

class CreateNewProtocol(forms.ModelForm):
    """
    A form to create a new
    :model:`pkpdapp.Protocol`.

    Can pass an additional kwarg 'project', which adds the new model to this
    project id
    """
    def __init__(self, *args, **kwargs):
        if 'project' in kwargs:
            self.project_id = kwargs.pop('project')
        else:
            self.project_id = None

        super().__init__(*args, **kwargs)

    class Meta:
        fields = ('name', )
        model = Protocol

    dose_amount = forms.FloatField(
        initial=0.0,
        help_text=Dose._meta.get_field('amount').help_text,
    )
    protocol_start_time = forms.FloatField(
        initial=0.0,
        help_text='Start time of the treatment, in hours',
    )
    dose_duration = forms.FloatField(
        initial=0.01,
        help_text=Dose._meta.get_field('duration').help_text,
    )
    dose_period = forms.FloatField(
        required=False,
        help_text='''
            Periodicity at which doses are administered. If empty the dose
            is administered only once.
        '''
    )
    number_of_doses = forms.IntegerField(
        required=False,
        help_text='''
            Number of administered doses.
        '''
    )

    def save(self, commit=True):
        instance = super().save()
        if self.project_id is not None:
            project = Project.objects.get(id=self.project_id)
            project.protocols.add(instance)
            if commit:
                project.save()
        number_of_doses = self.cleaned_data['number_of_doses']
        if number_of_doses is None:
            number_of_doses = 1
        dose_period = self.cleaned_data['dose_period']
        if dose_period is None:
            dose_period = 0.0
        for i in range(number_of_doses):
            start_time = self.cleaned_data['protocol_start_time'] \
                + i * dose_period
            dose = Dose(
                protocol=instance,
                start_time=start_time,
                duration=self.cleaned_data['dose_duration'],
                amount=self.cleaned_data['dose_amount'],
            )
            if commit:
                dose.save()





        return instance
