from rest_framework import serializers
from pkpdapp.models import Dataset


class DatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = ('name', 'datetime', 'description')
