#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework.permissions import (
    BasePermission
)


from pkpdapp.models import (
    Project, ProjectAccess
)


class NotADatasetDose(BasePermission):
    def has_object_permission(self, request, view, obj):
        is_update_method = request.method == 'PUT' or request.method == 'PATCH'
        if is_update_method and obj.protocol.dataset:
            return False
        return True


class NotADatasetProtocol(BasePermission):
    def has_object_permission(self, request, view, obj):
        is_update_method = \
            request.method == 'PUT' or request.method == 'PATCH'
        if is_update_method and obj.dataset:
            return False
        return True


class CheckAccessToProject(BasePermission):
    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True

        is_create_method = (
            request.method == 'POST'
        )

        if isinstance(request.data, list):
            project_id = request.data[0].get('project', None)
        else:
            project_id = request.data.get('project', None)

        if project_id is None:
            return True

        project = Project.objects.get(id=project_id)

        if project is None:
            return True

        try:
            access = ProjectAccess.objects.get(
                project=project,
                user=request.user,
            )
        except ProjectAccess.DoesNotExist:
            return False

        if is_create_method:
            return not access.read_only

        return True

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True

        is_update_method = (
            request.method == 'PUT' or
            request.method == 'PATCH'
        )

        project = obj.get_project()

        if project is None:
            return True

        try:
            access = ProjectAccess.objects.get(
                project=project,
                user=request.user,
            )
        except ProjectAccess.DoesNotExist:
            return False

        if is_update_method:
            return not access.read_only

        return True
