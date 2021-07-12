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
    Profile, Dose, Unit,
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
    states = serializers.SerializerMethodField('get_states')
    outputs = serializers.SerializerMethodField('get_outputs')
    variables = serializers.SerializerMethodField('get_variables')

    def get_states(self, m):
        return m.states()

    def get_outputs(self, m):
        return m.outputs()

    def get_variables(self, m):
        return m.variables()

    class Meta:
        model = DosedPharmacokineticModel
        fields = '__all__'


class PharmacodynamicSerializer(serializers.ModelSerializer):
    states = serializers.SerializerMethodField('get_states')
    outputs = serializers.SerializerMethodField('get_outputs')
    variables = serializers.SerializerMethodField('get_variables')

    def get_states(self, m):
        return m.states()

    def get_outputs(self, m):
        return m.outputs()

    def get_variables(self, m):
        return m.variables()

    class Meta:
        model = PharmacodynamicModel
        fields = '__all__'


class PkpdSerializer(serializers.ModelSerializer):
    class Meta:
        model = PkpdModel
        fields = '__all__'


# all serializers that get used by the dataset serializer

class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = '__all__'


class BiomarkerTypeSerializer(serializers.ModelSerializer):
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
    # dataset_ids = serializers.PrimaryKeyRelatedField(
    #     queryset=Dataset.objects.all(), source='datasets',
    #     many=True, required=False,
    # )
    # pk_model_ids = serializers.PrimaryKeyRelatedField(
    #     queryset=DosedPharmacokineticModel.objects.all(),
    #     source='pk_models',
    #     many=True, required=False,
    # )
    # pd_model_ids = serializers.PrimaryKeyRelatedField(
    #     queryset=PharmacodynamicModel.objects.all(),
    #     source='pd_models',
    #     many=True, required=False,
    # )
    # pkpd_model_ids = serializers.PrimaryKeyRelatedField(
    #     queryset=PkpdModel.objects.all(),
    #     source='pkpd_models',
    #     many=True,
    #     required=False,
    # )
    # protocol_ids = serializers.PrimaryKeyRelatedField(
    #     queryset=Protocol.objects.all(),
    #     source='protocols',
    #     many=True,
    #     required=False,
    # )
    # user_ids = serializers.PrimaryKeyRelatedField(
    #     queryset=User.objects.all(),
    #     source='users',
    #     many=True,
    # )

    class Meta:
        model = Project
        fields = '__all__'
