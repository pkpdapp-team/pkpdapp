#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import views, status
from rest_framework.response import Response
from pkpdapp.models import (
    DosedPharmacokineticModel, PharmacodynamicModel,
    PkpdModel, StoredDosedPharmacokineticModel,
    StoredPkpdModel, StoredPharmacodynamicModel
)


class CopyBaseView(views.APIView):
    def post(self, request, pk, format=None):
        try:
            m = self.model.objects.get(pk=pk)
        except self.model.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        result = self.stored_model.objects.create(m)

        return Response(result)


class CopyPkView(CopyBaseView):
    model = DosedPharmacokineticModel
    stored_model = StoredDosedPharmacokineticModel


class CopyPdView(CopyBaseView):
    model = PharmacodynamicModel
    stored_model = StoredPharmacodynamicModel


class CopyPkpdView(CopyBaseView):
    model = PkpdModel
    stored_model = StoredPkpdModel
