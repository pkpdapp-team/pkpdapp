#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
from rest_framework import views, status
from rest_framework.response import Response
from rest_framework import serializers
from drf_spectacular.utils import extend_schema
from pkpdapp.models import (
    CombinedModel, PharmacodynamicModel, Variable
)

class SimulateSerializer(serializers.Serializer):
    outputs = serializers.ListField(child=serializers.CharField())
    initial_conditions = serializers.DictField(child=serializers.FloatField())
    variables = serializers.DictField(child=serializers.FloatField())
    time_max = serializers.FloatField(required=False)


class SimulateResponseSerializer(serializers.Serializer):
    time = serializers.ListField(child=serializers.FloatField())
    outputs = serializers.DictField(child=serializers.ListField(child=serializers.FloatField()))

    def to_representation(self, instance):
        outputs = {}
        times = [] 
        for var_id, values in instance.items():
            variable = Variable.objects.get(pk=var_id)
            if variable.name == 'time' or variable.name == 't':
                times = values
            outputs[var_id] = values
        return {
            'outputs': outputs,
            'time': times,
        }

 
@extend_schema(
    request=SimulateSerializer,
    responses={
        200: SimulateResponseSerializer,
        404: None,
    },

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
        time_max = request.data.get('time_max', None)
        result = m.simulate(outputs, initial_conditions, variables, time_max)
        serialized_result = SimulateResponseSerializer(result)
        return Response(serialized_result.data)


class SimulateCombinedView(SimulateBaseView):
    model = CombinedModel


class SimulatePdView(SimulateBaseView):
    model = PharmacodynamicModel

