#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

"""
Views of the pkpdapp project.

For more information please see
https://docs.djangoproject.com/en/3.0/topics/http/views/.
"""

from django.views.generic import TemplateView, DetailView
from django.http import HttpResponseNotFound
from pkpdapp.models import Project


class IndexView(TemplateView):
    template_name = 'index.html'


class GenericView(TemplateView):
    template_name = 'generic.html'

class ProjectDetailView(DetailView):
    """
    As per django.DetailView, by default this uses the pk argument to select a
    project.  However, if pk is not provided, then the currently logged in
    user's selected project is shown.  A project is only shown if the currently
    logged in user is added to this project
    """

    model = Project
    template_name = 'project_detail.html'

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return Project.objects.filter(users=self.request.user)
        else:
            return Project.objects.none()

    def get_object(self, queryset=None):
        if queryset is None:
            queryset = self.get_queryset()
        if "pk" in self.kwargs:
            return queryset.get(
                id=self.kwargs.get("pk")
            )
        else:
            if self.request.user.is_authenticated:
                return self.request.user.profile.selected_project

