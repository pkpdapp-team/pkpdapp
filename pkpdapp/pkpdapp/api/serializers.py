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
    StandardUnit, Profile, Dose,
)
from django.contrib.auth.models import User


class DoseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dose
        fields = '__all__'


class ProtocolSerializer(serializers.ModelSerializer):
    doses = DoseSerializer(
        many=True, read_only=True
    )
    dose_ids = serializers.PrimaryKeyRelatedField(
        queryset=Dose.objects.all(),
        source='doses',
        many=True, write_only=True,
    )

    class Meta:
        model = Protocol
        fields = '__all__'


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
        required=False,
        source='pharmacokinetic_model', write_only=True
    )

    protocol = ProtocolSerializer(
        read_only=True
    )
    protocol_id = serializers.PrimaryKeyRelatedField(
        queryset=Protocol.objects.all(),
        source='protocol',
        required=False,
        allow_null=True,
        write_only=True,
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


class ProjectSerializer(serializers.ModelSerializer):
    datasets = DatasetSerializer(
        many=True, read_only=True
    )
    dataset_ids = serializers.PrimaryKeyRelatedField(
        queryset=Dataset.objects.all(), source='datasets',
        many=True, write_only=True,
        required=False,
    )
    pk_models = DosedPharmacokineticSerializer(
        many=True, read_only=True
    )
    pk_model_ids = serializers.PrimaryKeyRelatedField(
        queryset=DosedPharmacokineticModel.objects.all(),
        source='pk_models',
        many=True, write_only=True,
        required=False,
    )
    pd_models = PharmacodynamicSerializer(
        many=True, read_only=True
    )
    pd_model_ids = serializers.PrimaryKeyRelatedField(
        queryset=PharmacodynamicModel.objects.all(),
        source='pd_models',
        many=True, write_only=True,
        required=False,
    )
    pkpd_models = PkpdSerializer(
        many=True, read_only=True
    )
    pkpd_model_ids = serializers.PrimaryKeyRelatedField(
        queryset=PkpdModel.objects.all(),
        source='pkpd_models',
        many=True, write_only=True,
        required=False,
    )
    protocols = ProtocolSerializer(
        many=True, read_only=True
    )
    protocol_ids = serializers.PrimaryKeyRelatedField(
        queryset=Protocol.objects.all(),
        source='protocols',
        many=True, write_only=True,
        required=False,
    )
    users = UserSerializer(
        many=True, read_only=True
    )
    user_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='users',
        many=True, write_only=True,
    )

    class Meta:
        model = Project
        fields = '__all__'
