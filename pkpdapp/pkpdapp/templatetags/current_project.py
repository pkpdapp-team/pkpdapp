#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django import template
from pkpdapp.models import Project

register = template.Library()


@register.simple_tag
def current_project(user):
    if user.profile.selected_project:
        return user.profile.selected_project

    projects = Project.objects.filter(users=user)
    if projects:
        return projects.first()

    return Project.objects.none()
