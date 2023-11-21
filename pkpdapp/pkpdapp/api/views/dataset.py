#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import (
    viewsets, decorators, parsers, response, status
)
from pkpdapp.api.views import (
    ProjectFilter,
)
from pkpdapp.api.serializers import (
    DatasetSerializer, DatasetCsvSerializer
)
from pkpdapp.models import Dataset


class DatasetView(viewsets.ModelViewSet):
    queryset = Dataset.objects.all()
    serializer_class = DatasetSerializer
    filter_backends = [ProjectFilter]

    @decorators.action(
        detail=True,
        serializer_class=DatasetCsvSerializer,
        methods=['PUT'],
        parser_classes=[parsers.MultiPartParser],
    )
    def csv(self, request, pk):
        obj = self.get_object()
        serializer = self.serializer_class(obj, data=request.data,
                                           partial=True)
        if serializer.is_valid():
            serializer.save()
            dataset_serializer = DatasetSerializer(obj)
            return response.Response(dataset_serializer.data)
        return response.Response(serializer.errors,
                                 status.HTTP_400_BAD_REQUEST)
