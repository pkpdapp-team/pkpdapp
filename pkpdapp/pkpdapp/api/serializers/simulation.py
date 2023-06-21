#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from rest_framework import serializers
from pkpdapp.models import (
    Simulation, SimulationYAxis, SimulationSlider,
    SimulationCxLine, SimulationPlot
)


class SimulationYAxisSerializer(serializers.ModelSerializer):
    class Meta:
        model = SimulationYAxis
        exclude = ['plot']


class SimulationSliderSerializer(serializers.ModelSerializer):
    class Meta:
        model = SimulationSlider
        exclude = ['simulation']


class SimulationCxLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = SimulationCxLine
        exclude = ['plot']


class SimulationPlotSerializer(serializers.ModelSerializer):
    y_axes = SimulationYAxisSerializer(
        many=True
    )
    cx_lines = SimulationCxLineSerializer(
        many=True
    )

    class Meta:
        model = SimulationPlot
        # fields = '__all__'
        exclude = ['simulation']

    def create(self, validated_data):
        y_axes_data = validated_data.pop('y_axes')
        cx_lines_data = validated_data.pop('cx_lines')
        plot = SimulationPlot.objects.create(**validated_data)
        for y_axis in y_axes_data:
            SimulationYAxis.objects.create(plot=plot, **y_axis)
        for cx_line in cx_lines_data:
            SimulationCxLine.objects.create(plot=plot, **cx_line)
        return plot

    def update(self, instance, validated_data):
        y_axes_data = validated_data.pop('y_axes')
        cx_lines_data = validated_data.pop('cx_lines')
        SimulationYAxis.objects.filter(plot=instance).delete()
        SimulationCxLine.objects.filter(plot=instance).delete()
        for y_axis in y_axes_data:
            SimulationYAxis.objects.create(plot=instance, **y_axis)
        for cx_line in cx_lines_data:
            SimulationCxLine.objects.create(plot=instance, **cx_line)
        return super().update(instance, validated_data)


class SimulationSerializer(serializers.ModelSerializer):
    sliders = SimulationSliderSerializer(
        many=True
    )
    plots = SimulationPlotSerializer(
        many=True
    )

    class Meta:
        model = Simulation
        fields = '__all__'

    def create(self, validated_data):
        slider_data = validated_data.pop('sliders')
        plot_data = validated_data.pop('plots')
        simulation = Simulation.objects.create(**validated_data)
        for slider in slider_data:
            SimulationSlider.objects.create(simulation=simulation, **slider)
        for plot in plot_data:
            plot['simulation'] = simulation
            SimulationPlotSerializer.create(SimulationPlotSerializer(), plot)
        return simulation

    def update(self, instance, validated_data):
        slider_data = validated_data.pop('sliders')
        plot_data = validated_data.pop('plots')
        SimulationSlider.objects.filter(simulation=instance).delete()
        SimulationPlot.objects.filter(simulation=instance).delete()
        for slider in slider_data:
            SimulationSlider.objects.create(simulation=instance, **slider)
        for plot in plot_data:
            plot['simulation'] = instance
            SimulationPlotSerializer.create(SimulationPlotSerializer(), plot)
        return super().update(instance, validated_data)
