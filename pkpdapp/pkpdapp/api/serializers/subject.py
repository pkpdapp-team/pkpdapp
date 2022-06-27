#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from pkpdapp.models import (
    Subject, SubjectGroup
)


class SubjectGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubjectGroup
        fields = '__all__'


class SubjectSerializer(serializers.ModelSerializer):
    groups = SubjectGroupSerializer(many=True, read_only=True)

    class Meta:
        model = Subject
        fields = '__all__'
