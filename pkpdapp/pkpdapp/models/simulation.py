#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

from django.db import models
from django.contrib.auth.models import User
from django.urls import reverse




## class to store options for simulation and plotting of results
## a project can have multiple simulations
class Simulation(models.Model):
    """
    A simulation, containing multiple :model:`pkpdapp.Dataset`,
    :model:`pkpdapp.PkpdModel` and users.
    """
    name = models.CharField(max_length=100, help_text='name of the simulation')

    project = models.ForeignKey(
        'Project', on_delete=models.CASCADE,
    )

    # enum class for different plot layouts
    class PlotLayout(models.TextChoices):
        ONE_BY_ONE = '1x1', '1x1'
        TWO_BY_ONE = '2x1', '2x1'
        ONE_BY_TUE = '1x2', '1x2'

    plot_layout = models.CharField(
        max_length=3,
        choices=PlotLayout.choices,
        default=PlotLayout.ONE_BY_ONE,
        help_text='layout of plots'
    )

    # unit for x axis (common for all plots)
    x_unit = models.ForeignKey(
        'Unit', on_delete=models.PROTECT,
        related_name='simulations'
    )

    y_unit = models.ForeignKey(
        'Unit', on_delete=models.PROTECT,
        related_name='simulations_y'
    )

    y_unit2 = models.ForeignKey(
        'Unit', on_delete=models.PROTECT,
        related_name='simulations_y2',
        null=True, blank=True
    )

    receptor_occupancy = models.BooleanField(
        default=False,
        help_text='True if receptor occupancy should be plotted'
    )

# model for mapping a variable to a y axis
class SimulationYAxis(models.Model):
    simulation = models.ForeignKey(
        'Simulation', on_delete=models.CASCADE,
        related_name='y_axes'
    )

    variable = models.ForeignKey(
        'Variable', on_delete=models.CASCADE,
        related_name='y_axes'
    )

    display_unit = models.ForeignKey(
        'Unit', on_delete=models.PROTECT,
        related_name='y_axes'
    )

    axis_row = models.IntegerField(
        help_text='row of the axis in the plot layout',
        default=0
    )

    axis_col = models.IntegerField(
        help_text='column of the axis in the plot layout',
        default=0
    )

# model for a slider on the plot. the sliders alter the value of a variable
# in the model
class SimulationSlider(models.Model):
    simulation = models.ForeignKey(
        'Simulation', on_delete=models.CASCADE,
        related_name='sliders'
    )

    variable = models.ForeignKey(
        'Variable', on_delete=models.CASCADE,
        related_name='sliders'
    )


class SimulationCxLine(models.Model):
    simulation = models.ForeignKey(
        'Simulation', on_delete=models.CASCADE,
        related_name='cx_lines'
    )
    value = models.FloatField(
        help_text='value of the line'
    )

    

