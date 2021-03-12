#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
import xml.etree.ElementTree as ET
from django import forms
from django.utils.translation import gettext as _
from pkpdapp.models import (
    DosedPharmacokineticModel, PharmacodynamicModel,
    Project, Protocol, Dataset,
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
