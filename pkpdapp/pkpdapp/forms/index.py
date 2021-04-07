#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django import forms
from pkpdapp.models import (
    Project
)


class IndexForm(forms.Form):
    current_project = forms.ModelChoiceField(
        queryset=Project.objects.none()
    )

    def __init__(self, user=None, *args, **kwargs):
        super(IndexForm, self).__init__(*args, **kwargs)
        self.user = user
        if self.user is not None:
            self.profile = user.profile
            self.fields['current_project'].queryset = \
                Project.objects.filter(users=user)

    def change_selected_project(self):
        self.profile.selected_project = self.current_project
        self.profile.save()
