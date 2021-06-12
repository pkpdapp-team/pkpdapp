#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from pkpdapp.models import (
    Dataset, BiomarkerType, Subject, Protocol, Project,
    PharmacokineticModel, PharmacodynamicModel,
    DosedPharmacokineticModel, PkpdModel,
    StandardUnit, Profile,
)
from django.contrib.auth.models import User


class PharmacokineticSerializer(serializers.ModelSerializer):
    class Meta:
        model = PharmacokineticModel
        fields = '__all__'


class DosedPharmacokineticSerializer(serializers.ModelSerializer):
    pharmacokinetic_model = PharmacokineticSerializer(
        read_only=True
    )
    pharmacokinetic_model_id = serializers.PrimaryKeyRelatedField(
        queryset=PharmacokineticModel.objects.all(),
        source='pharmacokinetic_model', write_only=True
    )

    class Meta:
        model = DosedPharmacokineticModel
        fields = '__all__'


class PharmacodynamicSerializer(serializers.ModelSerializer):
    class Meta:
        model = PharmacodynamicModel
        fields = '__all__'


class PkpdSerializer(serializers.ModelSerializer):
    class Meta:
        model = PkpdModel
        fields = '__all__'


# all serializers that get used by the dataset serializer

class StandardUnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = StandardUnit
        fields = '__all__'


class BiomarkerTypeSerializer(serializers.ModelSerializer):
    unit = StandardUnitSerializer(
        read_only=True
    )
    unit_id = serializers.PrimaryKeyRelatedField(
        queryset=StandardUnit.objects.all(),
        source='unit', write_only=True
    )

    class Meta:
        model = BiomarkerType
        fields = '__all__'


class ProtocolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Protocol
        fields = '__all__'


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = '__all__'


class DatasetSerializer(serializers.ModelSerializer):
    biomarker_types = BiomarkerTypeSerializer(
        many=True, read_only=True
    )
    protocols = ProtocolSerializer(
        many=True, read_only=True
    )
    subjects = SubjectSerializer(
        many=True, read_only=True
    )

    class Meta:
        model = Dataset
        fields = '__all__'


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'


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
            'id', 'first_name', 'last_name', 'email', 'profile', 'project_set'
        )
