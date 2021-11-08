#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import views, status
from rest_framework.response import Response
from pkpdapp.models import (
    DosedPharmacokineticModel, PharmacodynamicModel
)


class SimulateBaseView(views.APIView):
    def post(self, request, pk, format=None):
        try:
            m = self.model.objects.get(pk=pk)
        except self.model.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        outputs = request.data.get('outputs', None)
        initial_conditions = request.data.get('initial_conditions', None)
        variables = request.data.get('variables', None)
        result = m.simulate(outputs, initial_conditions, variables)
        return Response(result)


class SimulatePkView(SimulateBaseView):
    model = DosedPharmacokineticModel


class SimulatePdView(SimulateBaseView):
    model = PharmacodynamicModel
