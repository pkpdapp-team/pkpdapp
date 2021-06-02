#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import serializers
from pkpdapp.models import (Dataset, BiomarkerType, Subject, Protocol, Project)
from django.contrib.auth.models import User


# all serializers that get used by the dataset serializer
class BiomarkerTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = BiomarkerType
        fields = ('name', 'unit', 'description', 'dataset')


class ProtocolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Protocol
        fields = ('name', 'compound', 'subject', 'dose_type')


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ('id_in_dataset', 'dose_group', 'group', 'metadata')


class DatasetSerializer(serializers.ModelSerializer):
    biomarkertypes = serializers.SerializerMethodField('find_biomarkertypes')
    subjects = serializers.SerializerMethodField('find_subjects')
    protocols = serializers.SerializerMethodField('find_protocols')

    def find_biomarkertypes(self, dataset):
        biomarkers = BiomarkerType.objects.filter(dataset=dataset)
        return [BiomarkerTypeSerializer(bm).data for bm in biomarkers]

    def find_protocols(self, dataset):
        protocols = Protocol.objects.filter(dataset=dataset)
        return [ProtocolSerializer(pc).data for pc in protocols]

    def find_subjects(self, dataset):
        subjects = Subject.objects.filter(dataset=dataset)
        return [SubjectSerializer(sj).data for sj in subjects]

    class Meta:
        model = Dataset
        fields = ('name', 'datetime', 'description', 'subjects',
                  'biomarkertypes', 'protocols')


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ('name', 'description', 'datasets', 'protocols')


class UserSerializer(serializers.ModelSerializer):
    projects = serializers.SerializerMethodField('find_projects')

    def find_projects(self, user):
        projects = Project.objects.filter(users=user)
        return [ProjectSerializer(pj).data for pj in projects]

    class Meta:
        model = User
        fields = ('id', 'projects')
