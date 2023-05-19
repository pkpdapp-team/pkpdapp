#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from rest_framework import serializers
from pkpdapp.models import (
    Simulation, SimulationYAxis, SimulationSlider, SimulationCxLine
)


class SimulationYAxisSerializer(serializers.ModelSerializer):
    class Meta:
        model = SimulationYAxis
        fields = '__all__'

class SimulationSliderSerializer(serializers.ModelSerializer):
    class Meta:
        model = SimulationSlider
        fields = '__all__'

class SimulationCxLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = SimulationCxLine
        fields = '__all__'


class SimulationSerializer(serializers.ModelSerializer):
    y_axis = SimulationYAxisSerializer(
        many=True
    )
    slider = SimulationSliderSerializer(
        many=True
    )
    cx_line = SimulationCxLineSerializer(
        many=True
    )
    class Meta:
        model = Simulation
        fields = '__all__'

    def create(self, validated_data):
        y_axis_data = validated_data.pop('y_axis')
        slider_data = validated_data.pop('slider')
        cx_line_data = validated_data.pop('cx_line')
        simulation = Simulation.objects.create(**validated_data)
        for y_axis in y_axis_data:
            SimulationYAxis.objects.create(simulation=simulation, **y_axis)
        for slider in slider_data:
            SimulationSlider.objects.create(simulation=simulation, **slider)
        for cx_line in cx_line_data:
            SimulationCxLine.objects.create(simulation=simulation, **cx_line)
        return simulation
    
    def update(self, instance, validated_data):
        y_axis_data = validated_data.pop('y_axis')
        slider_data = validated_data.pop('slider')
        cx_line_data = validated_data.pop('cx_line')
        SimulationYAxis.objects.filter(simulation=instance).delete()
        SimulationSlider.objects.filter(simulation=instance).delete()
        SimulationCxLine.objects.filter(simulation=instance).delete()
        for y_axis in y_axis_data:
            SimulationYAxis.objects.create(simulation=instance, **y_axis)
        for slider in slider_data:
            SimulationSlider.objects.create(simulation=instance, **slider)
        for cx_line in cx_line_data:
            SimulationCxLine.objects.create(simulation=instance, **cx_line)
        return super().update(instance, validated_data)