#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.views.generic import DetailView, CreateView, UpdateView, DeleteView
from django.urls import reverse_lazy
from pkpdapp.models import Project
from django.http import Http404


class ProjectDetailView(DetailView):
    """
    As per django.DetailView, by default this uses the pk argument to select a
    project.  However, if pk is not provided, then the currently logged in
    user's selected project is shown.  A project is only shown if the currently
    logged in user has access to the project, otherwise it gives a 404 error
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
            try:
                return queryset.get(
                    id=self.kwargs.get("pk")
                )
            except Project.DoesNotExist:
                raise Http404
        else:
            if self.request.user.is_authenticated:
                return self.request.user.profile.selected_project
            else:
                raise Http404

class ProjectCreate(CreateView):
    model = Project
    template_name = 'project_form.html'
    fields = ['name', 'description', 'users']

class ProjectUpdate(UpdateView):
    model = Project
    template_name = 'project_form.html'
    fields = ['name', 'description', 'users']

class ProjectDelete(DeleteView):
    model = Project
    template_name = 'project_confirm_delete.html'
    success_url = reverse_lazy('project-list')
