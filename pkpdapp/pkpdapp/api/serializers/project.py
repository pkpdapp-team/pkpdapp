#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from pkpdapp.models import (
    ProjectAccess, Project
)


class ProjectAccessSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectAccess
        fields = '__all__'
        read_only_fields = ("project", )


class BaseProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'


class ProjectSerializer(serializers.ModelSerializer):
    user_access = ProjectAccessSerializer(
        source='projectaccess_set', many=True
    )

    class Meta:
        model = Project
        fields = '__all__'

    def create(self, validated_data):
        # save method of log_likelihood will create its own parameters,
        # so ignore any parameters that are given
        print(validated_data)
        users = validated_data.pop('projectaccess_set')
        project = BaseProjectSerializer().create(
            validated_data
        )
        for user in users:
            user['project'] = project
            serializer = ProjectAccessSerializer()
            serializer.create(user)
        return project

    def update(self, instance, validated_data):
        users = validated_data.pop('projectaccess_set')
        old_accesses = list(instance.projectaccess_set.all())
        project = BaseProjectSerializer().update(
            instance, validated_data
        )
        for user in users:
            serializer = ProjectAccessSerializer()
            old_access = old_accesses.pop(0)
            new_access = serializer.update(old_access, user)
            new_access.save()

        return project
