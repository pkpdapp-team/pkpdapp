#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from rest_framework import viewsets
from pkpdapp.models import Simulation, SimulationYAxis, SimulationSlider, SimulationCxLine
from pkpdapp.api.serializers import (
    SimulationSerializer, SimulationYAxisSerializer, SimulationSliderSerializer, SimulationCxLineSerializer
)

class SimulationViewSet(viewsets.ModelViewSet):
    queryset = Simulation.objects.all()
    serializer_class = SimulationSerializer

class SimulationYAxisViewSet(viewsets.ModelViewSet):
    queryset = SimulationYAxis.objects.all()
    serializer_class = SimulationYAxisSerializer

class SimulationSliderViewSet(viewsets.ModelViewSet):
    queryset = SimulationSlider.objects.all()
    serializer_class = SimulationSliderSerializer

class SimulationCxLineViewSet(viewsets.ModelViewSet):
    queryset = SimulationCxLine.objects.all()
    serializer_class = SimulationCxLineSerializer