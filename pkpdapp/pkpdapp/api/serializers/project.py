#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from django.db import transaction
from rest_framework import serializers
from pkpdapp.emails import send_project_shared_email
from pkpdapp.models import ProjectAccess, Project, SubjectGroup


class ProjectAccessSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectAccess
        fields = "__all__"
        read_only_fields = ("project",)


class BaseProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = "__all__"


def _notify_shared(access_list, project, shared_by):
    """email each newly shared user once the surrounding transaction commits"""
    for access in access_list:
        transaction.on_commit(
            lambda a=access: send_project_shared_email(
                a.user, project, shared_by, a.read_only
            )
        )


class ProjectSerializer(serializers.ModelSerializer):
    user_access = ProjectAccessSerializer(source="projectaccess_set", many=True)
    datasets = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    protocols = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = Project
        fields = "__all__"
        read_only_fields = ("created",)

    def _request_user(self):
        request = self.context.get("request")
        return getattr(request, "user", None)

    def create(self, validated_data):
        users = validated_data.pop("projectaccess_set")
        project = BaseProjectSerializer().create(validated_data)
        shared_by = self._request_user()
        new_accesses = []
        for user in users:
            user["project"] = project
            serializer = ProjectAccessSerializer()
            access = serializer.create(user)
            if access.user != shared_by:
                new_accesses.append(access)
        _notify_shared(new_accesses, project, shared_by)
        # every project starts with a base simulation group ("Sim-Group 1")
        SubjectGroup.objects.create(name="Sim-Group 1", project=project, dataset=None)
        return project

    def update(self, instance, validated_data):
        users = validated_data.pop("projectaccess_set")
        old_accesses = list(instance.projectaccess_set.all())
        project = BaseProjectSerializer().update(instance, validated_data)
        shared_by = self._request_user()
        new_accesses = []
        for user in users:
            user["project_id"] = instance.id
            serializer = ProjectAccessSerializer()
            old_access = [
                i for i, a in enumerate(old_accesses) if a.user == user["user"]
            ]
            if not old_access:
                new_access = serializer.create(user)
                new_accesses.append(new_access)
            else:
                new_access = serializer.update(old_accesses.pop(old_access[0]), user)
            new_access.save()

        # delete any old accesses
        for old_access in old_accesses:
            old_access.delete()

        project.refresh_from_db()
        _notify_shared(new_accesses, project, shared_by)

        return project
