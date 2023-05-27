#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from rest_framework import serializers
from pkpdapp.models import (
    Simulation, SimulationYAxis, SimulationSlider, SimulationCxLine, SimulationPlot
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

class SimulationPlotSerializer(serializers.ModelSerializer):
    y_axes = SimulationYAxisSerializer(
        many=True
    )
    cx_lines = SimulationCxLineSerializer(
        many=True
    )
    class Meta:
        model = SimulationPlot
        fields = '__all__'

    def create(self, validated_data):
        y_axes_data = validated_data.pop('y_axes')
        cx_lines_data = validated_data.pop('cx_lines')
        simulation_plot = SimulationPlot.objects.create(**validated_data)
        for y_axis in y_axes_data:
            SimulationYAxis.objects.create(simulation_plot=simulation_plot, **y_axis)
        for cx_line in cx_lines_data:
            SimulationCxLine.objects.create(simulation_plot=simulation_plot, **cx_line)
        return simulation_plot

    def update(self, instance, validated_data):
        y_axes_data = validated_data.pop('y_axes')
        cx_lines_data = validated_data.pop('cx_lines')
        SimulationYAxis.objects.filter(simulation_plot=instance).delete()
        SimulationCxLine.objects.filter(simulation_plot=instance).delete()
        for y_axis in y_axes_data:
            SimulationYAxis.objects.create(simulation_plot=instance, **y_axis)
        for cx_line in cx_lines_data:
            SimulationCxLine.objects.create(simulation_plot=instance, **cx_line)
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
        slider_data = validated_data.pop('slider')
        plot_data = validated_data.pop('plots')
        simulation = Simulation.objects.create(**validated_data)
        for slider in slider_data:
            SimulationSlider.objects.create(simulation=simulation, **slider)
        for plot in plot_data:
            SimulationPlot.objects.create(simulation=simulation, **plot)
        return simulation
    
    def update(self, instance, validated_data):
        slider_data = validated_data.pop('slider')
        plot_data = validated_data.pop('plots')
        SimulationYAxis.objects.filter(simulation=instance).delete()
        for slider in slider_data:
            SimulationSlider.objects.create(simulation=instance, **slider)
        for plot in plot_data:
            SimulationPlot.objects.create(simulation=instance, **plot)  
        return super().update(instance, validated_data)