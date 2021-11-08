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


class ProjectSerializer(serializers.ModelSerializer):
    user_access = ProjectAccessSerializer(
        source='projectaccess_set', many=True, read_only=True
    )

    class Meta:
        model = Project
        fields = '__all__'
