from rest_framework import serializers
from pkpdapp.models import (Dataset, BiomarkerType, Subject)


class DatasetSerializer(serializers.ModelSerializer):
    biomarkertypes = serializers.SerializerMethodField('find_biomarkertypes')
    subject_dosegroup = serializers.SerializerMethodField(
        'find_subject_dosegroup')

    def find_biomarkertypes(self, dataset):
        biomarkers = BiomarkerType.objects.filter(dataset=dataset)
        return [bm.name for bm in biomarkers]

    def find_subject_dosegroup(self, dataset):
        subjects = Subject.objects.filter(dataset=dataset)
        return [sj.dose_group for sj in subjects]

    class Meta:
        model = Dataset
        fields = ('name', 'datetime', 'description',
                  'biomarkertypes', 'subject_dosegroup')
