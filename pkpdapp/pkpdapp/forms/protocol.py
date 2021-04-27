#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django import forms
from pkpdapp.models import (
    Project, Dose, Protocol,
)


class ProtocolForm(forms.ModelForm):
    """
    A form to create a :model:`pkpdapp.Protocol`.

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
        fields = ('name', 'dose_type')
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
        if commit:
            Dose.objects.filter(protocol=instance).delete()
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
