#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from django.contrib.auth.models import User
from pkpdapp.models import (
    Profile
)


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = '__all__'


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)
    project_set = serializers.PrimaryKeyRelatedField(
        many=True, read_only=True,
    )

    class Meta:
        model = User
        fields = '__all__'
        fields = (
            'id', 'username', 'first_name',
            'last_name', 'email', 'profile', 'project_set'
        )


class UserSearchResultSerializer(serializers.Serializer):
    """A user found by search; id is null for directory-only users."""
    id = serializers.IntegerField(allow_null=True)
    username = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.CharField()
    department = serializers.CharField()
    is_placeholder = serializers.BooleanField()


class PlaceholderRequestSerializer(serializers.Serializer):
    username = serializers.CharField()
