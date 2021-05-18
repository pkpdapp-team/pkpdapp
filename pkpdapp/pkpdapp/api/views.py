from django.shortcuts import render
from rest_framework import viewsets
from .serializers import DatasetSerializer
from pkpdapp.models import Dataset


class DatasetView(viewsets.ModelViewSet):
    queryset = Dataset.objects.all()
    serializer_class = DatasetSerializer
